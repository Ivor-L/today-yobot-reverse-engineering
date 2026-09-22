#!/usr/bin/env python3
"""Split project-owned Rspack concatenated modules into readable JS fragments.

These files are compiled snippets for analysis, not original TypeScript or
independently executable modules.
"""

from bisect import bisect_right
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parent.parent
BUNDLES = {
    "desktop": ROOT / "recovered/app/dist/app/app/index.js",
    "preload": ROOT / "recovered/app/dist/preload/desktop.cjs",
    "web-runtime-host": ROOT / "recovered/app/dist/app/web-runtime-host.cjs",
}


def extract(name: str, path: Path) -> tuple[int, int]:
    bundle = path.read_text()
    markers = list(re.finditer(r"^;// CONCATENATED MODULE: (.+)$", bundle, re.M))
    module_ends = [m.start() for m in re.finditer(r"^},\n\d+\(", bundle, re.M)]
    rows = ["original_path\tfragment_path\tbytes"]
    counts = {"src": 0, "packages": 0}

    for index, marker in enumerate(markers):
        original = marker.group(1)
        if original.startswith("./src/"):
            relative = Path(original[2:])
            counts["src"] += 1
        elif original.startswith("../../packages/"):
            relative = Path(original[6:])
            counts["packages"] += 1
        else:
            continue

        start = marker.end() + 1
        next_marker = markers[index + 1].start() if index + 1 < len(markers) else len(bundle)
        module_index = bisect_right(module_ends, start)
        next_module_end = module_ends[module_index] if module_index < len(module_ends) else len(bundle)
        end = min(next_marker, next_module_end)
        code = bundle[start:end].rstrip() + "\n"

        destination = ROOT / "recovered/fragments" / name / relative.parent / (relative.name + ".fragment.js")
        destination.parent.mkdir(parents=True, exist_ok=True)
        header = (
            f"// Compiled fragment from {original}.\n"
            "// The original TypeScript and import graph are not restored.\n\n"
        )
        destination.write_text(header + code)
        rows.append(f"{original}\t{destination.relative_to(ROOT)}\t{len(code.encode())}")

    manifest = ROOT / "recovered/metadata" / f"{name}-fragments.tsv"
    manifest.write_text("\n".join(rows) + "\n")
    return counts["src"], counts["packages"]


for bundle_name, bundle_path in BUNDLES.items():
    desktop_count, package_count = extract(bundle_name, bundle_path)
    print(f"{bundle_name}: {desktop_count} desktop and {package_count} shared-package fragments")
