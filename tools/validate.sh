#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node --check "$ROOT/script.js"
python3 -c "import json; json.load(open('$ROOT/db.json')); json.load(open('$ROOT/x-articles.json')); print('json ok')"
test -f "$ROOT/favicon.svg"
test -f "$ROOT/fonts.css"
echo "validate ok"
