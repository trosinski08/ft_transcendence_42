#!/usr/bin/env bash
set -euo pipefail

# Downloads Press Start 2P (Latin) WOFF2 into frontend/src/assets/pixel-font.woff2
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/src/assets"
mkdir -p "$OUT_DIR"
OUT="$OUT_DIR/pixel-font.woff2"

# Latin subset WOFF2 URL (from Google Fonts CSS)
URL="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2"

if [ -f "$OUT" ]; then
  echo "Font already exists: $OUT"
  exit 0
fi

echo "Downloading $URL -> $OUT"
curl -L --fail -o "$OUT" "$URL"

if [ $? -eq 0 ]; then
  echo "Saved pixel font to $OUT"
else
  echo "Download failed" >&2
  exit 2
fi
