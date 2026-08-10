#!/usr/bin/env python3
"""
Sync Instagram posts untuk Nanomind Explorer.

Dua output:
  1. instagram-potd.json + media/potd-instagram.jpg  (Photo of the Day — latest post)
  2. instagram-posts.json + media/ig-*.jpg            (Gallery — multiple recent posts)

Source: public web profile API (same endpoint the IG website uses)
  GET /api/v1/users/web_profile_info/?username=...

Usage:
  python3 tools/sync-instagram-potd.py
  python3 tools/sync-instagram-potd.py --username extensions.ig
  python3 tools/sync-instagram-potd.py --dry-run
  python3 tools/sync-instagram-potd.py --max-posts 12
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_REGISTRY = ROOT / "instagram-potd.json"
DEFAULT_GALLERY = ROOT / "instagram-posts.json"
DEFAULT_DB = ROOT / "db.json"
MEDIA_DIR = ROOT / "media"
STILL_PATH = MEDIA_DIR / "potd-instagram.jpg"
VIDEO_PATH = MEDIA_DIR / "potd-instagram.mp4"
MAX_VIDEO_BYTES = 18 * 1024 * 1024  # ~18 MB — keep GH pages lean

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
IG_APP_ID = "936619743392459"


def log(msg: str) -> None:
    print(msg, flush=True)


def curl_get(url: str, timeout: int = 40, headers: Optional[List[str]] = None, out_file: Optional[Path] = None) -> str:
    cmd = ["curl", "-sL", "-A", UA, "--max-time", str(timeout)]
    if headers:
        for h in headers:
            cmd.extend(["-H", h])
    if out_file:
        cmd.extend(["-o", str(out_file)])
        cmd.append(url)
        try:
            subprocess.check_call(cmd)
            return str(out_file)
        except subprocess.CalledProcessError as e:
            log(f"  download fail {url}: {e}")
            return ""
    cmd.append(url)
    try:
        return subprocess.check_output(cmd, text=True, errors="ignore")
    except subprocess.CalledProcessError as e:
        log(f"  get fail {url}: {e}")
        return ""


def fetch_profile(username: str) -> Optional[dict]:
    url = f"https://www.instagram.com/api/v1/users/web_profile_info/?username={username}"
    raw = curl_get(
        url,
        timeout=45,
        headers=[
            f"X-IG-App-ID: {IG_APP_ID}",
            "Accept: application/json",
            "X-Requested-With: XMLHttpRequest",
            f"Referer: https://www.instagram.com/{username}/",
        ],
    )
    if not raw or not raw.strip().startswith("{"):
        log(f"  profile fetch empty/invalid ({len(raw or '')} bytes)")
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        log(f"  profile JSON error: {e}")
        return None


def caption_of(node: dict) -> str:
    edges = ((node.get("edge_media_to_caption") or {}).get("edges")) or []
    if not edges:
        return ""
    return ((edges[0].get("node") or {}).get("text") or "").strip()


def pick_media(node: dict) -> Dict[str, Any]:
    """Return image_url, video_url, is_video, shortcode from a timeline node."""
    shortcode = node.get("shortcode") or ""
    typename = node.get("__typename") or ""
    is_video = bool(node.get("is_video")) or typename == "GraphVideo"
    image_url = node.get("display_url") or node.get("thumbnail_src") or ""
    video_url = node.get("video_url") or ""

    # Carousel: prefer first video child if any, else first child image
    children = ((node.get("edge_sidecar_to_children") or {}).get("edges")) or []
    if children:
        for ch in children:
            cn = ch.get("node") or {}
            if cn.get("is_video") or cn.get("__typename") == "GraphVideo":
                is_video = True
                image_url = cn.get("display_url") or image_url
                video_url = cn.get("video_url") or video_url
                break
        else:
            cn = (children[0].get("node") or {})
            image_url = cn.get("display_url") or image_url
            if cn.get("is_video"):
                is_video = True
                video_url = cn.get("video_url") or video_url

    return {
        "shortcode": shortcode,
        "isVideo": is_video,
        "imageUrl": image_url,
        "videoUrl": video_url,
        "typename": typename,
        "permalink": f"https://www.instagram.com/p/{shortcode}/" if shortcode else "",
        "caption": caption_of(node),
        "takenAt": node.get("taken_at_timestamp"),
    }


def download_still(url: str, dest: Path) -> bool:
    if not url:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    if tmp.exists():
        tmp.unlink()
    ok = curl_get(url, timeout=60, out_file=tmp)
    if not ok or not tmp.exists() or tmp.stat().st_size < 800:
        if tmp.exists():
            tmp.unlink()
        return False
    tmp.replace(dest)
    log(f"  saved still → {dest.relative_to(ROOT)} ({dest.stat().st_size} bytes)")
    return True


def download_video(url: str, dest: Path) -> bool:
    if not url:
        return False
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    if tmp.exists():
        tmp.unlink()
    ok = curl_get(url, timeout=120, out_file=tmp)
    if not ok or not tmp.exists() or tmp.stat().st_size < 2000:
        if tmp.exists():
            tmp.unlink()
        return False
    if tmp.stat().st_size > MAX_VIDEO_BYTES:
        log(f"  skip video (too large: {tmp.stat().st_size} bytes)")
        tmp.unlink()
        return False
    tmp.replace(dest)
    log(f"  saved video → {dest.relative_to(ROOT)} ({dest.stat().st_size} bytes)")
    return True


def load_registry(path: Path, username: str) -> dict:
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception as e:
            log(f"  registry unreadable ({e}), starting fresh")
    return {
        "enabled": True,
        "username": username,
        "profileUrl": f"https://www.instagram.com/{username}/",
        "cacheMinutes": 30,
        "post": None,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description="Sync Instagram posts → POTD + gallery")
    ap.add_argument("--username", default=None, help="Instagram username (default: extensions.ig)")
    ap.add_argument("--registry", default=str(DEFAULT_REGISTRY), help="Path ke instagram-potd.json")
    ap.add_argument("--gallery", default=str(DEFAULT_GALLERY), help="Path ke instagram-posts.json")
    ap.add_argument("--db", default=str(DEFAULT_DB), help="db.json to mirror photoOfDay")
    ap.add_argument("--max-posts", type=int, default=12, help="Max posts di gallery (default 12)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-download", action="store_true", help="Skip media download (metadata only)")
    ap.add_argument("--no-gallery", action="store_true", help="Skip gallery sync (POTD only)")
    args = ap.parse_args()

    reg_path = Path(args.registry)
    reg = load_registry(reg_path, args.username or "extensions.ig")
    username = (args.username or reg.get("username") or "extensions.ig").lstrip("@")
    reg["username"] = username
    reg["profileUrl"] = f"https://www.instagram.com/{username}/"
    reg["enabled"] = True

    log(f"=== Sync Instagram POTD for @{username} ===")
    data = fetch_profile(username)
    if not data:
        log("WARNING: could not fetch profile — keeping previous potd")
        return 0

    user = ((data.get("data") or {}).get("user")) or {}
    edges = ((user.get("edge_owner_to_timeline_media") or {}).get("edges")) or []
    if not edges:
        log("WARNING: no timeline media — keeping previous potd")
        return 0

    node = (edges[0].get("node") or {})
    media = pick_media(node)
    log(f"  latest: {media['shortcode']} video={media['isVideo']} type={media['typename']}")
    log(f"  caption: {(media['caption'] or '')[:80]!r}")

    taken = media.get("takenAt")
    if taken:
        try:
            date_iso = datetime.fromtimestamp(int(taken), tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            date_day = date_iso[:10]
        except Exception:
            date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            date_day = date_iso[:10]
    else:
        date_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        date_day = date_iso[:10]

    local_image = f"media/{STILL_PATH.name}"
    local_video = f"media/{VIDEO_PATH.name}"
    still_ok = False
    video_ok = False

    if not args.no_download and not args.dry_run:
        still_ok = download_still(media["imageUrl"], STILL_PATH)
        if media["isVideo"] and media.get("videoUrl"):
            video_ok = download_video(media["videoUrl"], VIDEO_PATH)
        elif media["isVideo"] and not media.get("videoUrl"):
            log("  video post without video_url in profile payload — using still as poster")
            # remove stale local video if previous sync had one
            if VIDEO_PATH.exists() and (reg.get("post") or {}).get("shortcode") != media["shortcode"]:
                try:
                    VIDEO_PATH.unlink()
                except Exception:
                    pass
    elif args.dry_run:
        still_ok = STILL_PATH.exists()
        video_ok = VIDEO_PATH.exists()

    # Prefer local asset when download succeeded; else remote CDN (may expire)
    image_for_site = local_image if still_ok else (media["imageUrl"] or "")
    video_for_site = local_video if video_ok else (media.get("videoUrl") or "")

    display_name = (user.get("full_name") or username or "").strip()
    post = {
        "shortcode": media["shortcode"],
        "permalink": media["permalink"],
        "caption": media["caption"],
        "isVideo": bool(media["isVideo"]),
        "image": image_for_site,
        "imageRemote": media["imageUrl"],
        "video": video_for_site or None,
        "videoRemote": media.get("videoUrl") or None,
        "takenAt": date_iso,
        "date": date_day,
        "author": display_name,
        "username": username,
    }

    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    prev = (reg.get("post") or {}).get("shortcode")
    reg["post"] = post
    reg["lastSync"] = now
    reg["lastSyncStats"] = {
        "shortcode": media["shortcode"],
        "isVideo": post["isVideo"],
        "stillDownloaded": still_ok,
        "videoDownloaded": video_ok,
        "changed": prev != media["shortcode"],
        "candidates": len(edges),
    }
    reg["notes"] = (
        "Auto-updated by tools/sync-instagram-potd.py (GitHub Actions). "
        "Latest public post from the configured Instagram profile drives Photo of the Day."
    )

    # Mirror into db.json photoOfDay so existing render path works offline
    potd_mirror = {
        "image": post["image"],
        "video": post.get("video") or "",
        "isVideo": post["isVideo"],
        "caption": post["caption"] or f"Latest from @{username}",
        "credit": f"@{username} · Instagram",
        "date": post["date"],
        "permalink": post["permalink"],
        "source": "instagram",
        "shortcode": post["shortcode"],
    }

    if args.dry_run:
        log("Dry-run — not writing files")
        log(json.dumps(reg, indent=2)[:2000])
        return 0

    reg_path.write_text(json.dumps(reg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log(f"Wrote {reg_path.relative_to(ROOT)}")

    db_path = Path(args.db)
    if db_path.exists():
        try:
            db = json.loads(db_path.read_text(encoding="utf-8"))
            db["photoOfDay"] = potd_mirror
            # Keep Instagram about link in sync
            links = db.get("links") or []
            for link in links:
                if (link.get("title") or "").lower() == "instagram" or "instagram.com" in (link.get("url") or ""):
                    link["url"] = f"https://www.instagram.com/{username}/"
                    link["title"] = link.get("title") or "Instagram"
                    if not link.get("icon"):
                        link["icon"] = "fab fa-instagram"
            db["links"] = links
            db_path.write_text(json.dumps(db, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            log(f"Updated photoOfDay + Instagram link in {db_path.relative_to(ROOT)}")
        except Exception as e:
            log(f"WARNING: could not update db.json: {e}")

    log(f"Result POTD: @{username} /p/{media['shortcode']}/ video={post['isVideo']}")

    # === Gallery sync: ambil multiple recent posts → instagram-posts.json ===
    if not args.no_gallery:
        try:
            sync_gallery(
                gallery_path=Path(args.gallery),
                user=user,
                username=username,
                max_posts=args.max_posts,
                dry_run=args.dry_run,
                no_download=args.no_download,
                potd_shortcode=media["shortcode"],
            )
        except Exception as e:
            log(f"WARNING: gallery sync failed: {e}")

    return 0


def sync_gallery(
    gallery_path: Path,
    user: dict,
    username: str,
    max_posts: int,
    dry_run: bool,
    no_download: bool,
    potd_shortcode: str,
) -> None:
    """Sinkronkan multiple recent posts ke instagram-posts.json + download thumbnails."""
    edges = ((user.get("edge_owner_to_timeline_media") or {}).get("edges")) or []
    if not edges:
        log("  gallery: no timeline media")
        return

    # Load existing gallery (untuk merge — jangan overwrite post lama yang mungkin
    # sudah gak ada di timeline IG)
    existing: Dict[str, dict] = {}
    if gallery_path.exists():
        try:
            old = json.loads(gallery_path.read_text(encoding="utf-8"))
            for p in (old.get("posts") or []):
                sc = p.get("shortcode")
                if sc:
                    existing[sc] = p
        except Exception:
            pass

    posts: List[dict] = []
    downloaded = 0
    skipped = 0
    for edge in edges[:max_posts]:
        node = (edge.get("node") or {})
        m = pick_media(node)
        sc = m["shortcode"]
        if not sc:
            continue

        taken = m.get("takenAt")
        try:
            dt = datetime.fromtimestamp(int(taken), tz=timezone.utc)
            taken_iso = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            date_day = taken_iso[:10]
        except Exception:
            taken_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            date_day = taken_iso[:10]

        # Local thumbnail path: media/ig-<shortcode>.jpg
        thumb_path = MEDIA_DIR / f"ig-{sc}.jpg"
        local_thumb = f"media/ig-{sc}.jpg"

        if not no_download and not dry_run:
            if not thumb_path.exists() or thumb_path.stat().st_size < 800:
                if download_still(m["imageUrl"], thumb_path):
                    downloaded += 1
                else:
                    # Fallback ke remote URL kalau download gagal
                    local_thumb = m["imageUrl"]
                    skipped += 1
            else:
                # Already downloaded — keep
                pass
        elif dry_run:
            local_thumb = local_thumb if thumb_path.exists() else m["imageUrl"]
        else:
            # no_download mode — pakai remote URL
            local_thumb = m["imageUrl"]

        post = {
            "shortcode": sc,
            "permalink": m["permalink"],
            "caption": m["caption"],
            "isVideo": bool(m["isVideo"]),
            "typename": m["typename"],
            "image": local_thumb,
            "imageRemote": m["imageUrl"],
            "video": m.get("videoUrl") or None,
            "takenAt": taken_iso,
            "date": date_day,
            "username": username,
            "author": (user.get("full_name") or username or "").strip(),
            "isPotd": sc == potd_shortcode,
        }
        posts.append(post)

    # Sort by takenAt DESC (newest first)
    posts.sort(key=lambda p: p.get("takenAt", ""), reverse=True)

    # Cleanup: hapus thumbnail local yang gak ada di posts list lagi (orphaned)
    if not no_download and not dry_run:
        keep_shortcodes = {p["shortcode"] for p in posts}
        for f in MEDIA_DIR.glob("ig-*.jpg"):
            sc = f.stem.replace("ig-", "")
            if sc not in keep_shortcodes:
                try:
                    f.unlink()
                    log(f"  gallery: removed orphaned {f.name}")
                except Exception:
                    pass

    gallery = {
        "enabled": True,
        "username": username,
        "profileUrl": f"https://www.instagram.com/{username}/",
        "cacheMinutes": 30,
        "lastSync": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "lastSyncStats": {
            "postsInFeed": len(edges),
            "postsKept": len(posts),
            "thumbnailsDownloaded": downloaded,
            "thumbnailsSkipped": skipped,
        },
        "posts": posts,
        "notes": "Auto-updated by tools/sync-instagram-potd.py (GitHub Actions). Gallery of recent public posts.",
    }

    if dry_run:
        log("  gallery dry-run — not writing")
        log(f"  gallery: {len(posts)} posts, +{downloaded} new thumbnails")
        return

    gallery_path.write_text(json.dumps(gallery, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    log(f"  gallery: wrote {len(posts)} posts → {gallery_path.relative_to(ROOT)} (+{downloaded} thumbs)")


if __name__ == "__main__":
    sys.exit(main())
