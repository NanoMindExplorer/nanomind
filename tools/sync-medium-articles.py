#!/usr/bin/env python3
"""
Sync Medium articles for a user into medium-articles.json via the official
public RSS feed (https://medium.com/feed/@username).

Unlike X (which needs discovery + per-post verification since there's no
public timeline API), Medium's RSS already returns full post content in one
request — title, cover image, tags, and full content:encoded HTML — so this
script is a straight fetch-and-parse.

Caveat: Medium's public RSS only exposes the user's most recent stories
(typically ~10-25). This script merges newly-seen items into whatever is
already in the registry so older stories aren't lost once Medium rotates
them out of the live feed.

Usage:
  python3 tools/sync-medium-articles.py
  python3 tools/sync-medium-articles.py --username 0wlsky
  python3 tools/sync-medium-articles.py --dry-run
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from html import unescape
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "medium-articles.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
NS = {
    "content": "http://purl.org/rss/1.0/modules/content/",
    "dc": "http://purl.org/dc/elements/1.1/",
}


def log(msg: str) -> None:
    print(msg, flush=True)


def curl_get(url: str, timeout: int = 35) -> str:
    try:
        return subprocess.check_output(
            ["curl", "-sL", "-A", UA, "--max-time", str(timeout), url],
            text=True,
            errors="ignore",
        )
    except subprocess.CalledProcessError as e:
        log(f"  get fail {url}: {e}")
        return ""


def load_registry(path: Path, username: str) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"  warning: existing registry unreadable ({e}), starting fresh")
    return {
        "enabled": True,
        "username": username,
        "displayName": username,
        "categoryId": "medium-articles",
        "feedUrl": f"https://medium.com/feed/@{username}",
        "cacheMinutes": 30,
        "articles": [],
    }


def save_registry(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def strip_html(html: str, max_len: int = 220) -> str:
    text = re.sub(r"<[^>]+>", " ", html or "")
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > max_len:
        text = text[:max_len].rsplit(" ", 1)[0] + "…"
    return text


def first_image(html: str) -> str:
    m = re.search(r'<img[^>]+src="([^"]+)"', html or "")
    return m.group(1) if m else ""


def clean_link(link: str) -> str:
    return (link or "").split("?")[0]


def to_iso(pub_date: str) -> str:
    if not pub_date:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        dt = parsedate_to_datetime(pub_date)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_feed(xml_text: str) -> list[dict]:
    items: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as e:
        log(f"  XML parse error: {e}")
        return items
    channel = root.find("channel")
    if channel is None:
        return items
    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        link = clean_link(item.findtext("link") or "")
        guid = (item.findtext("guid") or link or "").strip()
        pub_date = item.findtext("pubDate") or ""
        creator = (item.findtext("dc:creator", namespaces=NS) or "").strip()
        content_html = item.findtext("content:encoded", namespaces=NS) or ""
        description = item.findtext("description") or ""
        categories = [c.text.strip() for c in item.findall("category") if c.text and c.text.strip()]
        if not title or not link:
            continue
        items.append({
            "guid": guid,
            "title": title,
            "link": link,
            "pubDate": to_iso(pub_date),
            "creator": creator,
            "categories": categories,
            "excerpt": strip_html(description) or strip_html(content_html),
            "coverImage": first_image(content_html),
            "contentHtml": content_html,
        })
    return items


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Medium articles into medium-articles.json")
    ap.add_argument("--username", default=None, help="Medium username (default from registry)")
    ap.add_argument("--registry", default=str(DEFAULT_REGISTRY), help="Path to medium-articles.json")
    ap.add_argument("--dry-run", action="store_true", help="Do not write file")
    args = ap.parse_args()

    reg_path = Path(args.registry)
    reg = load_registry(reg_path, args.username or "0wlsky")
    username = args.username or reg.get("username") or "0wlsky"
    reg["username"] = username
    feed_url = reg.get("feedUrl") or f"https://medium.com/feed/@{username}"

    log(f"=== Sync Medium articles for @{username} ===")
    xml_text = curl_get(feed_url)
    looks_valid = bool(xml_text) and ("<rss" in xml_text[:3000] or "<?xml" in xml_text[:200])
    if not looks_valid:
        log("WARNING: feed fetch looked empty/invalid — keeping existing articles")
        fresh: list[dict] = []
    else:
        fresh = parse_feed(xml_text)
    log(f"Fetched {len(fresh)} items from feed")

    existing = reg.get("articles") or []
    by_guid = {a.get("guid"): a for a in existing if a.get("guid")}
    added = 0
    for post in fresh:
        if post["guid"] not in by_guid:
            added += 1
        by_guid[post["guid"]] = post  # refresh in case content was edited on Medium

    merged = sorted(by_guid.values(), key=lambda a: a.get("pubDate", ""), reverse=True)

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    reg["articles"] = merged
    reg["lastSync"] = now
    reg["lastSyncStats"] = {"fetched": len(fresh), "added": added, "total": len(merged)}
    reg.setdefault("displayName", username)
    reg.setdefault("categoryId", "medium-articles")
    reg.setdefault("cacheMinutes", 30)
    reg["notes"] = (
        "Auto-updated by tools/sync-medium-articles.py (GitHub Actions) dari RSS resmi "
        f"Medium ({feed_url}). Medium hanya mengekspos story terbaru lewat RSS (biasanya "
        "~10-25), jadi script ini menggabungkan story baru dengan yang sudah tersimpan "
        "supaya story lama tidak hilang begitu tergeser dari feed."
    )

    log(f"Result: {len(merged)} articles (+{added} new)")
    for a in sorted(fresh, key=lambda a: a.get("pubDate", ""), reverse=True):
        if a["guid"] not in {e.get("guid") for e in existing if e.get("guid")}:
            log(f"  + {a['title'][:70]}")

    if args.dry_run:
        log("Dry-run — not writing file")
        log(json.dumps(reg, indent=2, ensure_ascii=False)[:1500])
        return 0

    save_registry(reg_path, reg)
    log(f"Wrote {reg_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
