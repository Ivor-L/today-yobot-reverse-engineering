#!/usr/bin/env bash
set -euo pipefail

app_path="${1:-/Applications/Today.app}"
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
resources="$app_path/Contents/Resources"
output="$project_root/recovered"

if [[ ! -f "$resources/app.asar" || ! -f "$resources/web-runtimes/prod.asar" ]]; then
  echo "找不到 Today 的两个 ASAR 归档：$app_path" >&2
  exit 1
fi
if ! command -v asar >/dev/null 2>&1; then
  echo "需要 asar 命令来解包。" >&2
  exit 1
fi

mkdir -p "$output/app" "$output/web-runtime" "$output/metadata"
asar extract "$resources/app.asar" "$output/app"
asar extract "$resources/web-runtimes/prod.asar" "$output/web-runtime"
cp "$app_path/Contents/Info.plist" "$output/metadata/Info.plist"
cp "$resources/web-runtimes/manifest.json" "$output/metadata/web-runtime-manifest.json"
cp "$resources/app-update.yml" "$output/metadata/app-update.yml"
shasum -a 256 "$resources/app.asar" "$resources/web-runtimes/prod.asar" > "$output/metadata/archive-sha256.txt"

python3 - "$output" <<'PY'
import json
import pathlib
import sys

output = pathlib.Path(sys.argv[1])
manifest = output / "web-runtime/apps/web/.next/server/app-paths-manifest.json"
routes = sorted(json.loads(manifest.read_text()).keys())
(output / "metadata/server-routes.txt").write_text("\n".join(routes) + "\n")
print(f"已解包到 {output}；找到 {len(routes)} 个服务端路由。")
PY
python3 "$project_root/scripts/extract_fragments.py"
