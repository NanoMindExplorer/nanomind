#!/usr/bin/env bash
# Optimize images into ./media as JPG + WebP (max 1600px)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/media"
MAX=1600
for src in "$@"; do
  [ -f "$src" ] || { echo "skip $src"; continue; }
  base=$(basename "$src" | sed 's/\.[^.]*$//')
  magick "$src" -colorspace sRGB -strip -resize "${MAX}x${MAX}>" -quality 85 "$ROOT/media/${base}.jpg"
  cwebp -q 82 -m 6 "$ROOT/media/${base}.jpg" -o "$ROOT/media/${base}.webp"
  echo "→ media/${base}.{jpg,webp}"
done
