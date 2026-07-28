#!/usr/bin/env python3
"""
Sync posts dari channel Telegram publik ke telegram-posts.json.

Memakai endpoint web preview resmi Telegram:
    https://t.me/s/<channel>
yang mengembalikan HTML render-an (no auth, no API key). Setiap post di-extract
dari markup `.tgme_widget_message_wrap[data-post="<channel>/<id>"]`.

Strategi:
  1. Load registry yang sudah ada (telegram-posts.json) — simpan known post IDs.
  2. Crawl halaman pertama https://t.me/s/<channel> → ambil 15-20 post terbaru.
  3. Pagination: jika ingin lebih lama, pake ?before=<oldest_id_known>.
  4. Merge: tambah post baru ke registry, jangan overwrite yang lama.
  5. Tulis registry + metadata lastSync.

Usage:
  python3 tools/sync-telegram-channel.py
  python3 tools/sync-telegram-channel.py --channel nanojournal
  python3 tools/sync-telegram-channel.py --channel nanojournal --pages 10
  python3 tools/sync-telegram-channel.py --dry-run

Env:
  tidak butuh token — channel harus publik (punya username).
"""

from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, List, Optional, Set
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "telegram-posts.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def log(msg: str) -> None:
    print(msg, flush=True)


def curl_get(url: str, timeout: int = 30) -> str:
    try:
        return subprocess.check_output(
            ["curl", "-sL", "-A", UA, "--max-time", str(timeout), url],
            text=True,
            errors="ignore",
        )
    except subprocess.CalledProcessError as e:
        log(f"  get fail {url}: {e}")
        return ""


# ============================================================
# HTML parser — minimal state machine untuk extract post data
# ============================================================
class TgPostParser(HTMLParser):
    """Walk widget HTML dan kumpulkan field per <div class="tgme_widget_message_wrap">."""

    def __init__(self, channel: str):
        super().__init__(convert_charrefs=True)
        self.channel = channel
        self.posts: List[dict] = []
        self._cur: Optional[dict] = None
        # stack class untuk tau konteks sekarang
        self._class_stack: List[str] = []
        # capture text only inside js-message_text
        self._text_capture: Optional[str] = None  # tag name atau None
        # capture <a href> inside message text
        self._pending_links: List[dict] = []
        self._cur_link_href: Optional[str] = None
        self._cur_link_text_parts: List[str] = []
        # photo background-image
        self._photo_wrap: Optional[str] = None  # bg-image url
        # datetime attr
        self._in_date = False
        self._link_in_date: Optional[str] = None

    def _cls(self, attrs: dict) -> str:
        return attrs.get("class", "")

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = a.get("class", "")
        data_post = a.get("data-post")

        if data_post and data_post.startswith(f"{self.channel}/"):
            # start of new message
            self._cur = {
                "postId": data_post.split("/", 1)[1],
                "channel": self.channel,
                "url": f"https://t.me/{data_post}",
                "textHtml": "",
                "textPlain": "",
                "links": [],
                "photos": [],
                "datetime": "",
                "views": "",
                "replyTo": None,
            }

        if self._cur is None:
            return

        # photo wrap: <a class="tgme_widget_message_photo_wrap ..." style="background-image:url('...')">
        if "tgme_widget_message_photo_wrap" in cls:
            style = a.get("style", "")
            m = re.search(r"background-image:\s*url\(['\"]?([^'\")]+)['\"]?\)", style)
            if m:
                self._cur["photos"].append(m.group(1))

        # date link: <a class="tgme_widget_message_date" href="https://t.me/..."><time datetime="...">
        if "tgme_widget_message_date" in cls:
            self._in_date = True
            self._link_in_date = a.get("href", self._cur.get("url", ""))

        if tag == "time" and self._in_date:
            dt = a.get("datetime", "")
            if dt:
                self._cur["datetime"] = dt

        # text content
        if "tgme_widget_message_text" in cls and "js-message_text" in cls:
            self._text_capture = "div"
            # start accumulating fresh text — reset textPlain & textHtml
            self._cur["_text_buf"] = []
            self._cur["_html_buf"] = []

        # track <a href> inside message_text for links list
        if self._text_capture and tag == "a":
            href = a.get("href", "")
            if href:
                self._cur_link_href = href
                self._cur_link_text_parts = []

        # reply quote
        if "tgme_widget_message_reply" in cls:
            parent_href = a.get("href", "")
            if parent_href:
                m = re.search(r"/(\d+)$", parent_href)
                if m:
                    self._cur["replyTo"] = m.group(1)

        # views
        if tag == "span" and "tgme_widget_message_views" in cls:
            self._cur["_capturing_views"] = True

        self._class_stack.append(cls)

    def handle_endtag(self, tag):
        if not self._class_stack:
            return
        self._class_stack.pop()

        if self._cur is None:
            return

        if tag == "a" and self._cur_link_href is not None:
            text = "".join(self._cur_link_text_parts).strip()
            if self._cur_link_href:
                self._cur["links"].append({"href": self._cur_link_href, "text": text})
            self._cur_link_href = None
            self._cur_link_text_parts = []

        # end text-capture div
        if self._text_capture == "div" and tag == "div":
            self._cur["textPlain"] = "".join(self._cur.get("_text_buf", [])).strip()
            # cleanup HTML buffer: keep raw (escaped) markup for rich rendering
            self._cur["textHtml"] = "".join(self._cur.get("_html_buf", [])).strip()
            self._text_capture = None

        if self._cur.get("_capturing_views") and tag == "span":
            self._cur["_capturing_views"] = False

        # End of message_wrap div = commit post
        # Use heuristic: when we close the outermost wrap div
        if tag == "div" and not self._class_stack and self._cur and self._cur.get("postId"):
            self._finalize_cur()

    def handle_data(self, data):
        if self._cur is None:
            return
        if self._text_capture:
            self._cur.setdefault("_text_buf", []).append(data)
            # escape minimal supaya safe untuk innerHTML di browser
            self._cur.setdefault("_html_buf", []).append(html_lib.escape(data, quote=False))
        if self._cur_link_href is not None:
            self._cur_link_text_parts.append(data)
        if self._cur.get("_capturing_views"):
            v = data.strip()
            if v:
                self._cur["views"] = v

    def handle_entityref(self, name):
        ch = html_lib.unescape(f"&{name};")
        if self._text_capture and self._cur is not None:
            self._cur.setdefault("_text_buf", []).append(ch)
            self._cur.setdefault("_html_buf", []).append(f"&{name};")
        if self._cur_link_href is not None:
            self._cur_link_text_parts.append(ch)

    def handle_charref(self, name):
        ch = html_lib.unescape(f"&#{name};")
        if self._text_capture and self._cur is not None:
            self._cur.setdefault("_text_buf", []).append(ch)
            self._cur.setdefault("_html_buf", []).append(f"&#{name};")
        if self._cur_link_href is not None:
            self._cur_link_text_parts.append(ch)

    def _finalize_cur(self):
        cur = self._cur
        if not cur:
            return
        # drop internal buffer keys
        for k in list(cur.keys()):
            if k.startswith("_"):
                cur.pop(k, None)
        # convert datetime → ISO if needed
        if cur.get("datetime"):
            try:
                dt = datetime.fromisoformat(cur["datetime"])
                cur["datetime"] = dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                pass
        else:
            cur["datetime"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # safety: textPlain fallback
        if not cur["textPlain"] and cur["textHtml"]:
            cur["textPlain"] = html_lib.unescape(re.sub(r"<[^>]+>", "", cur["textHtml"])).strip()
        # dedupe links
        seen = set()
        dedup = []
        for l in cur["links"]:
            if l["href"] not in seen:
                seen.add(l["href"])
                dedup.append(l)
        cur["links"] = dedup
        self.posts.append(cur)
        self._cur = None


def parse_page_html(html: str, channel: str) -> List[dict]:
    if not html or len(html) < 500:
        return []
    p = TgPostParser(channel)
    try:
        p.feed(html)
    except Exception as e:
        log(f"  parse error: {e}")
    return p.posts


def fetch_page(channel: str, before: Optional[int] = None) -> tuple[str, Optional[int]]:
    """Returns (html, oldest_post_id_for_next_page)."""
    url = f"https://t.me/s/{channel}"
    if before:
        url += f"?before={before}"
    html = curl_get(url)
    if not html:
        return "", None
    # find oldest post id in this page
    ids = [int(m) for m in re.findall(r'data-post="' + re.escape(channel) + r'/(\d+)"', html)]
    oldest = min(ids) if ids else None
    return html, oldest


# ============================================================
# Registry I/O
# ============================================================
def load_registry(path: Path, channel: str) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"  warning: registry unreadable ({e}), starting fresh")
    return {
        "enabled": True,
        "channel": channel,
        "channelUrl": f"https://t.me/{channel}",
        "previewUrl": f"https://t.me/s/{channel}",
        "categoryId": "telegram",
        "cacheMinutes": 5,
        "lastSync": None,
        "posts": [],
    }


def save_registry(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ============================================================
# Main
# ============================================================
def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Telegram channel posts into telegram-posts.json")
    ap.add_argument("--channel", default="nanojournal", help="Telegram channel username (tanpa @)")
    ap.add_argument("--registry", default=str(DEFAULT_REGISTRY), help="Path ke telegram-posts.json")
    ap.add_argument("--pages", type=int, default=1, help="Jumlah halaman yang di-crawl (1 = ~15 post terbaru)")
    ap.add_argument("--max-posts", type=int, default=600, help="Batas maksimum post di registry (FIFO — oldest di-drop)")
    ap.add_argument("--dry-run", action="store_true", help="Jangan tulis file")
    args = ap.parse_args()

    channel = args.channel.lstrip("@").strip()
    if not channel:
        log("Error: channel name kosong")
        return 1

    reg_path = Path(args.registry)
    reg = load_registry(reg_path, channel)
    existing_posts = reg.get("posts") or []
    existing_ids: Set[str] = {str(p.get("postId")) for p in existing_posts if p.get("postId")}
    log(f"=== Sync Telegram channel @{channel} ===")
    log(f"Existing posts in registry: {len(existing_posts)}")

    all_new: List[dict] = []
    before: Optional[int] = None
    seen_ids: Set[str] = set(existing_ids)
    pages_done = 0
    for page_idx in range(max(1, args.pages)):
        html, oldest = fetch_page(channel, before)
        if not html:
            log(f"  page {page_idx + 1}: empty")
            break
        posts = parse_page_html(html, channel)
        fresh = []
        for p in posts:
            pid = str(p.get("postId", ""))
            if not pid or pid in seen_ids:
                continue
            seen_ids.add(pid)
            fresh.append(p)
        log(f"  page {page_idx + 1}: parsed {len(posts)} posts, +{len(fresh)} new")
        all_new.extend(fresh)
        pages_done += 1
        if oldest is None or not fresh:
            break
        before = oldest
        time.sleep(0.4)  # jangan ban

    if not all_new and not existing_posts:
        log("WARNING: tidak ada post ter-parse sama sekali — channel mungkin private / salah nama")
        if not args.dry_run:
            # tetap update lastSync supaya observability kelihatan
            reg["lastSync"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            reg["lastSyncStats"] = {
                "pagesFetched": pages_done,
                "newPosts": 0,
                "total": 0,
            }
            save_registry(reg_path, reg)
            log(f"Wrote empty registry → {reg_path}")
        return 0

    # merge: new posts dulu (paling baru), lalu existing yang belum di-overwrite
    by_id: Dict[str, dict] = {}
    merged_order: List[str] = []
    for p in all_new:
        pid = str(p["postId"])
        if pid not in by_id:
            merged_order.append(pid)
        by_id[pid] = p
    for p in existing_posts:
        pid = str(p.get("postId", ""))
        if not pid:
            continue
        if pid not in by_id:
            merged_order.append(pid)
            by_id[pid] = p
    # sort by post id DESC (newest first)
    merged_order.sort(key=lambda x: int(x) if x.isdigit() else 0, reverse=True)
    # cap size — buang post paling lama kalau melebihi max_posts
    if args.max_posts and len(merged_order) > args.max_posts:
        dropped = len(merged_order) - args.max_posts
        merged_order = merged_order[:args.max_posts]
        log(f"Capped registry to last {args.max_posts} posts (dropped {dropped} oldest)")
    merged_posts = [by_id[pid] for pid in merged_order]

    added_count = len(all_new)
    log(f"Result: {len(merged_posts)} posts total (+{added_count} new)")

    reg["enabled"] = True
    reg["channel"] = channel
    reg["channelUrl"] = f"https://t.me/{channel}"
    reg["previewUrl"] = f"https://t.me/s/{channel}"
    reg["categoryId"] = "telegram"
    reg["cacheMinutes"] = 5
    reg["lastSync"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    reg["lastSyncStats"] = {
        "pagesFetched": pages_done,
        "newPosts": added_count,
        "total": len(merged_posts),
    }
    reg["notes"] = (
        "Auto-updated by tools/sync-telegram-channel.py (GitHub Actions). "
        "Posts ditarik dari t.me/s/<channel> (web preview resmi, no auth). "
        "Run tiap 15 menit — post baru akan muncul di website dalam <=15 menit."
    )
    reg["posts"] = merged_posts

    if args.dry_run:
        log("Dry-run — not writing file")
        log(json.dumps({k: v for k, v in reg.items() if k != "posts"}, indent=2)[:1200])
        return 0

    save_registry(reg_path, reg)
    log(f"Wrote {reg_path} ({len(merged_posts)} posts)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
