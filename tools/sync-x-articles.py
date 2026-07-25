#!/usr/bin/env python3
"""
Discover X Articles published by a user and update x-articles.json.

Strategies (in order):
  1. Keep existing statusIds from x-articles.json
  2. Optional official X API v2 (if X_BEARER_TOKEN env is set)
  3. Scrape recent timeline via twstalker.com (profile + pagination)
  4. Jina reader on x.com profile (pinned / visible posts)
  5. Verify each candidate via FixTweet (api.fxtwitter.com) — only keep posts that include an article payload

Usage:
  python3 tools/sync-x-articles.py
  python3 tools/sync-x-articles.py --username Deadmouse_jpeg --deep
  python3 tools/sync-x-articles.py --dry-run

Env:
  X_BEARER_TOKEN  optional X API v2 bearer for richer discovery
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "x-articles.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


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


def curl_post(url: str, data: dict, referer: str = "", timeout: int = 35) -> str:
    body = urllib.parse.urlencode(data)
    cmd = [
        "curl", "-sL", "-A", UA, "--max-time", str(timeout),
        "-X", "POST", url,
        "-H", "Content-Type: application/x-www-form-urlencoded",
        "-H", "X-Requested-With: XMLHttpRequest",
        "--data", body,
    ]
    if referer:
        cmd.extend(["-H", f"Referer: {referer}"])
    try:
        return subprocess.check_output(cmd, text=True, errors="ignore")
    except subprocess.CalledProcessError as e:
        log(f"  post fail {url}: {e}")
        return ""


def load_registry(path: Path) -> dict:
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {
        "enabled": True,
        "username": "Deadmouse_jpeg",
        "displayName": "Noob Sensei",
        "categoryId": "x-articles",
        "apiBase": "https://api.fxtwitter.com",
        "cacheMinutes": 30,
        "statusIds": [],
    }


def save_registry(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def discover_via_x_api(username: str, bearer: str) -> Set[str]:
    ids: Set[str] = set()
    # Resolve user id
    raw = curl_get(
        f"https://api.twitter.com/2/users/by/username/{urllib.parse.quote(username)}",
    )
    # curl with auth
    try:
        raw = subprocess.check_output(
            [
                "curl", "-sL", "-A", UA, "--max-time", "30",
                "-H", f"Authorization: Bearer {bearer}",
                f"https://api.twitter.com/2/users/by/username/{urllib.parse.quote(username)}",
            ],
            text=True, errors="ignore",
        )
        uid = json.loads(raw).get("data", {}).get("id")
    except Exception as e:
        log(f"  X API user lookup failed: {e}")
        return ids
    if not uid:
        log(f"  X API: no user id ({raw[:200]})")
        return ids

    # User timeline pages
    next_token = None
    for _ in range(10):
        params = {
            "max_results": "100",
            "exclude": "replies",
            "tweet.fields": "entities,note_tweet,attachments,created_at",
        }
        if next_token:
            params["pagination_token"] = next_token
        qs = urllib.parse.urlencode(params)
        url = f"https://api.twitter.com/2/users/{uid}/tweets?{qs}"
        try:
            raw = subprocess.check_output(
                ["curl", "-sL", "-A", UA, "--max-time", "30", "-H", f"Authorization: Bearer {bearer}", url],
                text=True, errors="ignore",
            )
            data = json.loads(raw)
        except Exception as e:
            log(f"  X API timeline fail: {e}")
            break
        for tw in data.get("data") or []:
            tid = str(tw.get("id") or "")
            if tid:
                ids.add(tid)
            # text may contain article URL
            text = tw.get("text") or ""
            for m in re.findall(r"(?:status|i/article)/(\d{15,})", text):
                ids.add(m)
            for u in ((tw.get("entities") or {}).get("urls") or []):
                exp = u.get("expanded_url") or u.get("url") or ""
                for m in re.findall(r"(?:status|i/article)/(\d{15,})", exp):
                    ids.add(m)
        next_token = (data.get("meta") or {}).get("next_token")
        if not next_token:
            break
        time.sleep(0.3)
    log(f"  X API candidates: {len(ids)}")
    return ids


def discover_via_twstalker(username: str, max_pages: int = 25) -> Set[str]:
    ids: Set[str] = set()
    html = curl_get(f"https://twstalker.com/{username}")
    if not html or len(html) < 500:
        log("  twstalker: empty profile HTML")
        return ids

    ids.update(re.findall(r"status/(\d{15,})", html))
    cursor_m = re.search(r'data-cursor="([^"]+)"', html)
    query_m = re.search(r'data-query="([^"]+)"', html)
    if not cursor_m or not query_m:
        log(f"  twstalker: no cursor (initial ids={len(ids)})")
        return ids

    cursor = cursor_m.group(1)
    data_query = query_m.group(1)
    log(f"  twstalker: initial {len(ids)} ids, paginating…")

    for page in range(1, max_pages + 1):
        raw = curl_post(
            "https://twstalker.com/service/api",
            {
                "page": str(page),
                "cursor": cursor,
                "data": data_query,
                "action": "profile",
            },
            referer=f"https://twstalker.com/{username}",
        )
        if not raw:
            break
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            log(f"  twstalker: bad JSON page {page}")
            break
        if not data or data == 0:
            break
        tweets = data.get("tweets") if isinstance(data, dict) else None
        if not tweets:
            break
        before = len(ids)
        if isinstance(tweets, dict):
            for tid, tw in tweets.items():
                if tid:
                    ids.add(str(tid))
                if isinstance(tw, dict):
                    for k in ("id", "id_str", "tweet_id"):
                        if tw.get(k):
                            ids.add(str(tw[k]))
                    text = json.dumps(tw)
                    ids.update(re.findall(r"(?:status|i/article)/(\d{15,})", text))
        elif isinstance(tweets, list):
            for tw in tweets:
                if not isinstance(tw, dict):
                    continue
                for k in ("id", "id_str", "tweet_id"):
                    if tw.get(k):
                        ids.add(str(tw[k]))
        if data.get("cursor"):
            cursor = data["cursor"]
        gained = len(ids) - before
        log(f"  twstalker page {page}: +{gained} (total {len(ids)})")
        # Stop only if API returns no cursor / empty batch, not merely overlapping IDs
        if not data.get("cursor") and gained == 0:
            break
        time.sleep(0.35)
    return ids


def discover_via_jina(username: str) -> Set[str]:
    ids: Set[str] = set()
    for path in ("", "/with_replies"):
        md = curl_get(f"https://r.jina.ai/https://x.com/{username}{path}")
        ids.update(re.findall(r"status/(\d{15,})", md))
        ids.update(re.findall(r"i/article/(\d{15,})", md))
        time.sleep(0.2)
    log(f"  jina candidates: {len(ids)}")
    return ids


def verify_article(username: str, status_id: str) -> Optional[dict]:
    raw = curl_get(f"https://api.fxtwitter.com/{username}/status/{status_id}", timeout=25)
    if not raw:
        return None
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return None
    tweet = data.get("tweet") or data
    art = tweet.get("article") if isinstance(tweet, dict) else None
    if not art:
        return None
    if not (art.get("title") or art.get("id")):
        return None
    return {
        "statusId": str(status_id),
        "title": art.get("title") or "",
        "articleId": str(art.get("id") or ""),
    }


def verify_many(
    username: str,
    candidates: Iterable[str],
    existing: Set[str],
    deep: bool,
) -> Tuple[List[str], List[dict]]:
    """Return (status_ids_with_articles, meta list)."""
    cand_list = sorted({str(c) for c in candidates if str(c).isdigit()}, key=lambda x: int(x), reverse=True)
    existing = {str(e) for e in existing}

    # Always re-verify existing so we don't drop them if discovery misses them
    to_check: List[str] = list(existing)
    # Prefer newest unknown IDs (new articles are almost always recent posts)
    new_ids = [c for c in cand_list if c not in existing]
    limit_new = 400 if deep else 120
    to_check.extend(new_ids[:limit_new])

    # de-dupe preserve order
    seen: Set[str] = set()
    ordered: List[str] = []
    for sid in to_check:
        if sid not in seen:
            seen.add(sid)
            ordered.append(sid)

    log(f"Verifying {len(ordered)} candidates via FixTweet (deep={deep})…")
    found_ids: List[str] = []
    meta: List[dict] = []
    for i, sid in enumerate(ordered, 1):
        info = verify_article(username, sid)
        if info:
            found_ids.append(sid)
            meta.append(info)
            log(f"  [{i}/{len(ordered)}] ARTICLE {sid} — {info['title'][:60]}")
        if i % 25 == 0:
            log(f"  …progress {i}/{len(ordered)} (found {len(found_ids)})")
        time.sleep(0.18)
    # newest first
    found_ids = sorted(set(found_ids), key=lambda x: int(x), reverse=True)
    return found_ids, meta


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync X Articles status IDs into x-articles.json")
    ap.add_argument("--username", default=None, help="X username (default from registry)")
    ap.add_argument("--registry", default=str(DEFAULT_REGISTRY), help="Path to x-articles.json")
    ap.add_argument("--deep", action="store_true", help="Deeper timeline scan + more FixTweet checks")
    ap.add_argument("--dry-run", action="store_true", help="Do not write file")
    ap.add_argument("--pages", type=int, default=0, help="Twstalker pages (0 = auto)")
    args = ap.parse_args()

    reg_path = Path(args.registry)
    reg = load_registry(reg_path)
    username = args.username or reg.get("username") or "Deadmouse_jpeg"
    existing = [str(x) for x in (reg.get("statusIds") or [])]
    existing_set = set(existing)

    log(f"=== Sync X Articles for @{username} ===")
    log(f"Existing IDs: {len(existing)}")

    candidates: Set[str] = set(existing_set)

    bearer = os.environ.get("X_BEARER_TOKEN") or os.environ.get("TWITTER_BEARER_TOKEN") or ""
    if bearer:
        log("Strategy: X API v2")
        candidates |= discover_via_x_api(username, bearer)
    else:
        log("Strategy: X API skipped (no X_BEARER_TOKEN)")

    pages = args.pages or (40 if args.deep else 25)
    log(f"Strategy: twstalker ({pages} pages)")
    candidates |= discover_via_twstalker(username, max_pages=pages)

    log("Strategy: jina reader")
    candidates |= discover_via_jina(username)

    log(f"Total unique candidates: {len(candidates)}")
    found_ids, meta = verify_many(username, candidates, existing_set, deep=args.deep)

    if not found_ids:
        log("WARNING: no articles verified — keeping existing list")
        found_ids = existing

    # Merge: prefer newly verified, never lose previously known if verify flaked
    # (unless deep and they truly have no article — still keep for safety for 1 run)
    merged = list(dict.fromkeys(found_ids + existing))
    merged = sorted(set(merged), key=lambda x: int(x), reverse=True)

    added = [i for i in merged if i not in existing_set]
    removed = [i for i in existing if i not in set(found_ids)]

    log(f"Result: {len(merged)} articles (+{len(added)} new, verify-miss {len(removed)})")
    for a in added:
        title = next((m["title"] for m in meta if m["statusId"] == a), "")
        log(f"  + {a} {title[:70]}")

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    reg["username"] = username
    reg["statusIds"] = merged
    reg["lastSync"] = now
    reg["lastSyncStats"] = {
        "candidates": len(candidates),
        "verified": len(found_ids),
        "added": added,
        "total": len(merged),
    }
    reg["notes"] = (
        "Auto-updated by tools/sync-x-articles.py (GitHub Actions). "
        "statusIds = X post IDs that carry published X Articles. "
        "Website fetches full content live via FixTweet."
    )

    if args.dry_run:
        log("Dry-run — not writing file")
        log(json.dumps(reg, indent=2)[:1500])
        return 0

    if merged == existing and reg_path.exists():
        # still update lastSync timestamp for observability
        old = load_registry(reg_path)
        if old.get("statusIds") == merged:
            reg_path.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            log(f"Updated lastSync only → {reg_path}")
            return 0

    save_registry(reg_path, reg)
    log(f"Wrote {reg_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
