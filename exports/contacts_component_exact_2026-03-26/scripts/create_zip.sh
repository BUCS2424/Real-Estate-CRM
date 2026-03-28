#!/usr/bin/env bash
set -euo pipefail
BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_ZIP="$BASE_DIR/../contacts_component_exact_2026-03-26.zip"
cd "$BASE_DIR"
zip -r "$OUT_ZIP" . -x "*.DS_Store"
echo "Created: $OUT_ZIP"
