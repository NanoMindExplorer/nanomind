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
DEFAULT_CONTENT = ROOT / "x-articles-content.json"
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def log(msg: str) -> None:
    print(msg, flush=True)


def curl_get(url: str, timeout: int = 35, extra_headers: Optional[List[str]] = None) -> str:
    cmd = ["curl", "-sL", "-A", UA, "--max-time", str(timeout)]
    if extra_headers:
        for h in extra_headers:
            cmd.extend(["-H", h])
    cmd.append(url)
    try:
        return subprocess.check_output(cmd, text=True, errors="ignore")
    except subprocess.CalledProcessError as e:
        log(f"  get fail {url}: {e}")
        return ""


def extract_status_ids(text: str) -> Set[str]:
    """Pull X status / article IDs from arbitrary HTML/markdown/JSON text."""
    if not text:
        return set()
    ids: Set[str] = set()
    # URL-shaped references only (avoid bare media/profile asset snowflakes)
    ids.update(re.findall(r"(?:status|i/article|statuses)/(\d{15,})", text))
    ids.update(re.findall(r"x\.com/[^/\s\"'<>]+/status/(\d{15,})", text, flags=re.I))
    return {i for i in ids if i.isdigit()}


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


def _looks_like_bot_wall(text: str) -> bool:
    t = (text or "").lower()
    return any(
        s in t
        for s in (
            "challenges.cloudflare.com",
            "cf-browser-verification",
            "attention required",
            "just a moment",
            "making sure you're not a bot",
            "enable javascript and cookies",
        )
    )


def discover_via_jina(username: str) -> Set[str]:
    """
    Jina AI reader on public X profile — often the only free path that
    surfaces brand-new posts / X Article cards (i/article links).

    X/Jina intermittently return Cloudflare challenge pages; detect that and
    fail fast instead of burning 9× retries on empty shells (which previously
    made the whole job miss new articles for hours).
    """
    ids: Set[str] = set()
    paths = ("", "/with_replies", "/media")
    headers = [
        "Accept: text/markdown, text/plain, */*",
        "X-Return-Format: markdown",
        "X-Timeout: 45",
    ]
    for path in paths:
        got_signal = False
        for attempt in range(1, 3):
            url = f"https://r.jina.ai/https://x.com/{username}{path}"
            md = curl_get(url, timeout=50, extra_headers=headers)
            if _looks_like_bot_wall(md):
                log(f"  jina {path or '/'}: bot-wall (html={len(md)}) attempt={attempt}")
                time.sleep(0.5)
                continue
            found = extract_status_ids(md)
            if found:
                ids |= found
                log(f"  jina {path or '/'}: +{len(found)} (html={len(md)})")
                got_signal = True
                break
            log(f"  jina {path or '/'}: no ids (html={len(md)}) attempt={attempt}")
            time.sleep(0.6 * attempt)
        if not got_signal and path == "":
            # one mobile fallback only for root profile
            md = curl_get(
                f"https://r.jina.ai/https://mobile.twitter.com/{username}",
                timeout=50,
                extra_headers=headers,
            )
            if not _looks_like_bot_wall(md):
                found = extract_status_ids(md)
                if found:
                    ids |= found
                    log(f"  jina mobile: +{len(found)} (html={len(md)})")
        time.sleep(0.25)

    log(f"  jina candidates: {len(ids)}")
    return ids


def discover_via_guest_api(username: str) -> Set[str]:
    """
    Best-effort: activate a public X guest token and resolve the user.
    UserTweets is often empty for pure guests, but UserByScreenName can still
    yield pinned tweet ids / profile snowflakes when present.
    """
    ids: Set[str] = set()
    # Public web client bearer (well-known; used by many open tools)
    bearer = (
        "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs"
        "%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
    )
    try:
        raw = subprocess.check_output(
            [
                "curl", "-sL", "--max-time", "20",
                "-X", "POST", "https://api.twitter.com/1.1/guest/activate.json",
                "-H", f"Authorization: Bearer {bearer}",
            ],
            text=True, errors="ignore",
        )
        gt = (json.loads(raw) or {}).get("guest_token")
    except Exception as e:
        log(f"  guest activate fail: {e}")
        return ids
    if not gt:
        log("  guest activate: no token")
        return ids

    variables = urllib.parse.quote(
        json.dumps({"screen_name": username, "withSafetyModeUserFields": True})
    )
    features = urllib.parse.quote(
        json.dumps(
            {
                "hidden_profile_subscriptions_enabled": True,
                "rweb_tipjar_consumption_enabled": True,
                "responsive_web_graphql_exclude_directive_enabled": True,
                "verified_phone_label_enabled": False,
                "subscriptions_verification_info_is_identity_verified_enabled": True,
                "subscriptions_verification_info_verified_since_enabled": True,
                "highlights_tweets_tab_ui_enabled": True,
                "responsive_web_twitter_article_notes_tab_enabled": True,
                "subscriptions_feature_can_gift_premium": True,
                "creator_subscriptions_tweet_preview_api_enabled": True,
                "responsive_web_graphql_skip_user_profile_image_extensions_enabled": False,
                "responsive_web_graphql_timeline_navigation_enabled": True,
            }
        )
    )
    # queryId known-working for UserByScreenName (2026)
    url = (
        f"https://api.x.com/graphql/G3KGOASz96M-Qu0nwmGXNg/UserByScreenName"
        f"?variables={variables}&features={features}"
    )
    try:
        raw = subprocess.check_output(
            [
                "curl", "-sL", "--max-time", "25",
                "-H", f"Authorization: Bearer {bearer}",
                "-H", f"x-guest-token: {gt}",
                "-H", "x-twitter-active-user: yes",
                url,
            ],
            text=True, errors="ignore",
        )
        data = json.loads(raw)
        user = (((data.get("data") or {}).get("user") or {}).get("result")) or {}
        leg = user.get("legacy") or {}
        for pid in leg.get("pinned_tweet_ids_str") or []:
            if pid:
                ids.add(str(pid))
        # Any status-like ids in payload
        ids |= extract_status_ids(raw)
        # Drop pure profile-image snowflake noise if only one asset-like id
        log(f"  guest UserByScreenName: {len(ids)} ids (pinned={leg.get('pinned_tweet_ids_str')})")
    except Exception as e:
        log(f"  guest user lookup fail: {e}")
    return ids


def discover_via_x_profile_html(username: str) -> Set[str]:
    """
    Most reliable free discovery (2026): guest_token + public x.com profile HTML.

    The logged-out profile HTML embeds recent status IDs in meta/markup even when
    jina/twstalker/UserTweets GraphQL are blocked. We then verify which IDs are
    X Articles via FixTweet.
    """
    ids: Set[str] = set()
    bearer = (
        "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs"
        "%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA"
    )
    cookie_jar = str(ROOT / ".x_guest_cookies.txt")
    try:
        raw = subprocess.check_output(
            [
                "curl", "-sL", "-A", UA, "--max-time", "25",
                "-c", cookie_jar, "-b", cookie_jar,
                "-X", "POST",
                "https://api.twitter.com/1.1/guest/activate.json",
                "-H", f"Authorization: Bearer {bearer}",
            ],
            text=True, errors="ignore",
        )
        gt = (json.loads(raw) or {}).get("guest_token")
    except Exception as e:
        log(f"  profile-html guest activate fail: {e}")
        return ids
    if not gt:
        log("  profile-html: no guest token")
        return ids

    def _scrape(url: str, label: str, extra_headers: Optional[List[str]] = None) -> Set[str]:
        hdrs = [
            f"x-guest-token: {gt}",
            "x-twitter-active-user: yes",
            "x-twitter-client-language: en",
            "Accept: text/html,application/xhtml+xml",
        ]
        if extra_headers:
            hdrs.extend(extra_headers)
        cmd = [
            "curl", "-sL", "-A", UA, "--max-time", "40",
            "-c", cookie_jar, "-b", cookie_jar,
        ]
        for h in hdrs:
            cmd.extend(["-H", h])
        cmd.append(url)
        try:
            html = subprocess.check_output(cmd, text=True, errors="ignore")
        except Exception as e:
            log(f"  profile-html {label}: fail {e}")
            return set()
        found = extract_status_ids(html)
        found |= set(re.findall(r'"rest_id"\s*:\s*"(\d{15,})"', html or ""))
        found |= set(re.findall(r'"id_str"\s*:\s*"(\d{15,})"', html or ""))
        found = {i for i in found if i.isdigit() and len(i) >= 15}
        if found:
            log(f"  profile-html {label}: +{len(found)} (html={len(html or '')})")
        else:
            log(f"  profile-html {label}: 0 ids (html={len(html or '')})")
        return found

    # Mobile first — consistently returns recent status IDs when desktop is empty
    for host, label in (
        (f"https://mobile.twitter.com/{username}", "mobile"),
        (f"https://mobile.x.com/{username}", "mobile.x"),
        (f"https://x.com/{username}", "desktop /"),
        (f"https://x.com/{username}/with_replies", "desktop /with_replies"),
        (f"https://x.com/{username}/media", "desktop /media"),
        (f"https://x.com/{username}/highlights", "desktop /highlights"),
    ):
        ids |= _scrape(host, label)
        time.sleep(0.3)

    log(f"  profile-html candidates: {len(ids)}")
    return ids


def discover_via_telegram_registry(telegram_path: Optional[Path] = None) -> Set[str]:
    """
    Pull status IDs from telegram-posts.json (already synced every ~15 min).
    If the author shares X Article links on Telegram, we pick them up even
    when jina/twstalker are blocked by Cloudflare.
    """
    ids: Set[str] = set()
    path = telegram_path or (ROOT / "telegram-posts.json")
    if not path.exists():
        log("  telegram registry: missing")
        return ids
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        log(f"  telegram registry: read fail ({e})")
        return ids
    posts = data.get("posts") or []
    for p in posts:
        if not isinstance(p, dict):
            continue
        blob_parts = [
            p.get("textPlain") or "",
            p.get("textHtml") or "",
            p.get("url") or "",
        ]
        for link in p.get("links") or []:
            if isinstance(link, str):
                blob_parts.append(link)
            elif isinstance(link, dict):
                blob_parts.append(link.get("href") or link.get("url") or "")
                blob_parts.append(link.get("text") or "")
        blob = "\n".join(blob_parts)
        ids |= extract_status_ids(blob)
    log(f"  telegram registry: {len(ids)} x-status candidates from {len(posts)} posts")
    return ids


def fetch_tweet_payload(username: str, status_id: str) -> Optional[dict]:
    """
    Full tweet payload that includes X Article body.
    Prefer api.fxtwitter.com — it returns Draft.js content.blocks.
    api.vxtwitter.com only has title/preview/image (no body) so use it only
    as a last-resort existence check, not for content cache.
    """
    best = None
    for base in (
        f"https://api.fxtwitter.com/{username}/status/{status_id}",
        f"https://api.vxtwitter.com/{username}/status/{status_id}",
    ):
        raw = curl_get(base, timeout=30)
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        tweet = data.get("tweet") or data
        if not isinstance(tweet, dict):
            continue
        art = tweet.get("article")
        if not art and isinstance(data, dict):
            art = data.get("article")
            if art:
                tweet = dict(tweet)
                tweet["article"] = art
        if not art or not (art.get("title") or art.get("id")):
            continue
        # Prefer payload that actually includes body blocks
        content = art.get("content") if isinstance(art, dict) else None
        blocks = (content or {}).get("blocks") if isinstance(content, dict) else None
        if blocks:
            return tweet
        if best is None:
            best = tweet
    return best


def verify_article(username: str, status_id: str) -> Optional[dict]:
    tweet = fetch_tweet_payload(username, status_id)
    if not tweet:
        return None
    art = tweet.get("article") or {}
    return {
        "statusId": str(status_id),
        "title": art.get("title") or "",
        "articleId": str(art.get("id") or ""),
        "tweet": tweet,
    }


def _blocks_from_article_content(content: Optional[dict]) -> List[dict]:
    """Draft.js-style blocks → nanomind body blocks (mirrors script.js)."""
    raw_blocks = (content or {}).get("blocks") or []
    out: List[dict] = []
    list_buf: Optional[dict] = None

    def flush_list() -> None:
        nonlocal list_buf
        if list_buf and list_buf.get("items"):
            out.append(list_buf)
        list_buf = None

    for b in raw_blocks:
        btype = b.get("type") or "unstyled"
        text = (b.get("text") or "").strip()
        if btype in ("unordered-list-item", "ordered-list-item"):
            ordered = btype == "ordered-list-item"
            if not list_buf or list_buf.get("ordered") != ordered:
                flush_list()
                list_buf = {"type": "list", "ordered": ordered, "items": []}
            if text:
                list_buf["items"].append(text)
            continue
        flush_list()
        if btype in ("header-one", "header-two", "header-three"):
            if text:
                out.append({"type": "heading", "text": text})
        elif btype == "blockquote":
            if text:
                out.append({"type": "quote", "text": text})
        elif btype == "atomic":
            continue
        else:
            if text:
                out.append({"type": "paragraph", "text": text})
    flush_list()
    return out


def _parse_twitter_date(s: str) -> str:
    if not s:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")
    # ISO
    try:
        if "T" in s or s.endswith("Z"):
            return datetime.fromisoformat(s.replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except Exception:
        pass
    # "Sun Aug 09 05:53:39 +0000 2026"
    for fmt in ("%a %b %d %H:%M:%S %z %Y", "%a %b %d %H:%M:%S +0000 %Y"):
        try:
            return datetime.strptime(s.replace("+0000", "+0000"), fmt).strftime("%Y-%m-%d")
        except Exception:
            continue
    try:
        # loose
        return datetime.strptime(s[4:19] + " " + s[-4:], "%b %d %H:%M:%S %Y").strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _estimate_read_time(blocks: List[dict]) -> int:
    words = 0
    for b in blocks:
        if b.get("type") == "list":
            words += len(" ".join(b.get("items") or []).split())
        else:
            words += len((b.get("text") or "").split())
    return max(1, (words + 199) // 200)


def _cover_from_tweet(tweet: dict, art: dict) -> str:
    mi = ((art.get("cover_media") or {}).get("media_info")) or {}
    cover = mi.get("original_img_url") or mi.get("url") or mi.get("preview_image_url") or ""
    if not cover:
        cover = art.get("cover_image") or ""
    if not cover:
        photos = ((tweet.get("media") or {}).get("photos")) or []
        if photos:
            cover = photos[0].get("url") or photos[0].get("original_img_url") or ""
    if cover.startswith("//"):
        cover = "https:" + cover
    if "pbs.twimg.com/media/" in cover and "name=" not in cover:
        cover += ("&" if "?" in cover else "?") + "name=large"
    return cover


def tweet_to_site_article(tweet: dict, username: str, display_name: str = "") -> dict:
    art = tweet.get("article") or {}
    body = _blocks_from_article_content(art.get("content"))
    status_id = str(tweet.get("id") or tweet.get("tweetID") or "")
    article_id = str(art.get("id") or status_id)
    preview = re.sub(r"\s+", " ", (art.get("preview_text") or "").replace("\n", " ")).strip()
    author = (
        ((tweet.get("author") or {}).get("name"))
        or ((tweet.get("author") or {}).get("screen_name"))
        or display_name
        or username
    )
    date = _parse_twitter_date(art.get("created_at") or tweet.get("created_at") or "")
    cover = _cover_from_tweet(tweet, art)
    if not cover:
        cover = ((tweet.get("author") or {}).get("avatar_url")
                 or (tweet.get("author") or {}).get("avatarUrl") or "")
    x_url = f"https://x.com/{username}/status/{status_id}"
    article_url = f"https://x.com/i/article/{article_id}" if art.get("id") else x_url
    return {
        "id": f"x-{status_id or article_id}",
        "title": art.get("title") or "Untitled X Article",
        "dek": preview,
        "category": "x-articles",
        "coverImage": cover,
        "author": author,
        "date": date,
        "readTime": _estimate_read_time(body),
        "featured": False,
        "tags": ["x-articles", f"@{username}"],
        "body": body,
        "source": "x",
        "xStatusId": status_id,
        "xArticleId": article_id,
        "xUrl": x_url,
        "articleUrl": article_url,
        "likes": tweet.get("likes") or 0,
        "views": tweet.get("views") or 0,
    }


def build_content_cache(
    username: str,
    status_ids: List[str],
    display_name: str = "",
    content_path: Path = DEFAULT_CONTENT,
) -> int:
    """
    Fetch full article bodies via FixTweet and write x-articles-content.json.
    Website loads this first (same-origin) so display no longer depends on
    browser→FixTweet (CORS / adblock / rate-limit).
    """
    log(f"Building content cache for {len(status_ids)} status IDs…")
    articles: List[dict] = []
    for i, sid in enumerate(status_ids, 1):
        tweet = fetch_tweet_payload(username, sid)
        if not tweet:
            log(f"  [{i}/{len(status_ids)}] miss {sid}")
            time.sleep(0.2)
            continue
        art = tweet_to_site_article(tweet, username, display_name)
        articles.append(art)
        log(f"  [{i}/{len(status_ids)}] ok {sid} — {art['title'][:55]}")
        time.sleep(0.22)
    articles.sort(key=lambda a: int(a.get("xStatusId") or 0), reverse=True)
    payload = {
        "enabled": True,
        "username": username,
        "displayName": display_name or username,
        "lastSync": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count": len(articles),
        "articles": articles,
        "notes": (
            "Full X Article bodies for the website. Built by tools/sync-x-articles.py. "
            "Client prefers this file over live FixTweet so articles always render."
        ),
    }
    content_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log(f"Wrote content cache → {content_path} ({len(articles)} articles)")
    return len(articles)


def verify_many(
    username: str,
    candidates: Iterable[str],
    existing: Set[str],
    deep: bool,
) -> Tuple[List[str], List[dict]]:
    """Return (status_ids_with_articles, meta list)."""
    cand_list = sorted({str(c) for c in candidates if str(c).isdigit()}, key=lambda x: int(x), reverse=True)
    existing = {str(e) for e in existing}

    # NEW candidates FIRST (so brand-new articles surface before we re-check
    # the whole existing list — previously existing-first delayed discovery).
    new_ids = [c for c in cand_list if c not in existing]
    limit_new = 400 if deep else 120
    to_check: List[str] = list(new_ids[:limit_new])
    # Then re-verify existing so we don't drop them if a single FixTweet flake happens
    to_check.extend(list(existing))

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

    # Optional manual inject (workflow_dispatch / secrets): EXTRA_STATUS_IDS=id1,id2
    extra = os.environ.get("EXTRA_STATUS_IDS") or ""
    if extra.strip():
        extra_ids = {x.strip() for x in re.split(r"[\s,;]+", extra) if x.strip().isdigit()}
        if extra_ids:
            log(f"Strategy: EXTRA_STATUS_IDS (+{len(extra_ids)})")
            candidates |= extra_ids

    # 1) x.com profile HTML via guest token — currently the most reliable free
    #    way to see brand-new posts when jina/twstalker are Cloudflare-blocked.
    log("Strategy: x.com profile HTML (guest token)")
    try:
        candidates |= discover_via_x_profile_html(username)
    except Exception as e:
        log(f"  profile-html error: {e}")

    # 2) Telegram bridge — articles shared to @nanojournal
    log("Strategy: telegram-posts.json bridge")
    candidates |= discover_via_telegram_registry()

    # 3) Jina (often bot-walled, kept as best-effort)
    log("Strategy: jina reader (profile + media + mobile)")
    candidates |= discover_via_jina(username)

    log("Strategy: X guest API (profile / pinned)")
    candidates |= discover_via_guest_api(username)

    pages = args.pages or (40 if args.deep else 12)
    log(f"Strategy: twstalker ({pages} pages)")
    try:
        candidates |= discover_via_twstalker(username, max_pages=pages)
    except Exception as e:
        log(f"  twstalker error: {e}")

    # Retry profile HTML if still no NEW candidates beyond existing list
    if len(candidates - existing_set) == 0:
        log("Strategy: profile-html retry (no new candidates yet)")
        time.sleep(1.2)
        try:
            candidates |= discover_via_x_profile_html(username)
        except Exception as e:
            log(f"  profile-html retry error: {e}")

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
        "Full bodies are written to x-articles-content.json for the website "
        "(so the browser does not depend on FixTweet CORS)."
    )

    if args.dry_run:
        log("Dry-run — not writing file")
        log(json.dumps(reg, indent=2)[:1500])
        return 0

    save_registry(reg_path, reg)
    log(f"Wrote {reg_path}")

    # ALWAYS rebuild content cache so the live site has same-origin article bodies.
    # (Previously we returned early on "lastSync only" and never refreshed content.)
    display_name = reg.get("displayName") or "Noob Sensei"
    try:
        build_content_cache(username, merged, display_name=display_name)
    except Exception as e:
        log(f"WARNING: content cache build failed: {e}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
