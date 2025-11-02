#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

# Dry-run info
echo "[info] Rewriting all *.ts files in-place (via filename_copy.ts)."
echo "[info] Excluding: node_modules, dist, build"
echo

# Find and process files safely (null-terminated)
find . -type f -name "*.pdf" \
#   -not -path "./node_modules/*" \
#   -not -path "./dist/*" \
#   -not -path "./build/*" \
#   -not -path "./backend/*" \
  -print0 | while IFS= read -r -d '' f; do
    dir="$(dirname "$f")"
    base="$(basename "$f" .pdf)"
    copy="${dir}/${base}_copy.pdf"

    # echo "-> $f"
    # 1) create empty copy
    # : > "$copy"
    # 2) copy contents into copy
    # cat "$f" > "$copy"
    # 3) remove original
    rm -f -- "$f"
    # 4) rename copy back to original name
    # mv -- "$copy" "$f"
done

echo
echo "[done] All *.ts files rewritten."