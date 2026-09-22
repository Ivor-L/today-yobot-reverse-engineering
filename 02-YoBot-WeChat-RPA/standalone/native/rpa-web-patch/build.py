"""Build the recovered RPA web copy that makes full friend sync optional.

The signed vendor bundle remains pristine.  This script pins its exact inputs and
produces small runtime overlays which recovery-bootstrap installs into the local
working copy after verifying that copy.
"""

from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VENDOR_JS = (
    ROOT
    / "vendor/wechat-rpa/2.0.0/YokoWebot RPA Control.app/Contents/Resources/webot/dist/js"
)
BUILD = Path(__file__).resolve().parent / "build"
TARGET_PREFIX = Path(
    "YokoWebot RPA Control.app/Contents/Resources/webot/dist/js"
)

PATCHES = {
    "app.5c30567d.js": {
        "sha256": "e1b015ed4e508419f7d2c39292476c6f94b6d3ed4159db2aa951548f5a291c5d",
        "replacements": [
            (
                'navTitle:"同步通讯录",title:"同步通讯录",description:"1.打开客户管理 -> 配置 -> 点击[同步]按钮。<br>2.同步好友耗时较长，建议先只同步一次群聊。<br><br>欢迎页每5分钟会自动刷新数据",actionText:"立即同步",completed:!1',
                'navTitle:"通讯录（可选）",title:"通讯录（可选）",description:"好友全量同步为可选项。账号已连接即可使用基础 BOT；首次建议只同步群聊。需要批量选择全部好友时，再手动运行好友全量同步。<br><br>欢迎页每5分钟会自动刷新数据",actionText:"选择同步范围",completed:!0',
            ),
            ("ae[0].completed=e.steps.step1", "ae[0].completed=!0"),
        ],
    },
    "210.1908a9fb.js": {
        "sha256": "28342947e685e2e8ae4809ccf7555033fec695c6a7adc5640f5f4ce05994972d",
        "replacements": [
            (
                "建议7天同步一次好友(注意：好友标签中不要有空格)",
                "好友全量同步为可选项；好友很多时建议跳过，只同步群聊。需要完整好友名单时再手动执行。",
            ),
            ("准备同步好友数据", "准备执行好友全量同步"),
            ('(0,s.eW)(" 同步好友 ",-1)', '(0,s.eW)(" 全量同步好友（可选） ",-1)'),
        ],
    },
}


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    if BUILD.exists():
        shutil.rmtree(BUILD)
    BUILD.mkdir(parents=True)
    entries = []
    for filename, spec in PATCHES.items():
        source = VENDOR_JS / filename
        original = source.read_bytes()
        actual = digest(original)
        if actual != spec["sha256"]:
            raise SystemExit(f"Refusing unknown RPA web asset {filename}: {actual}")
        text = original.decode("utf-8")
        for before, after in spec["replacements"]:
            count = text.count(before)
            if count != 1:
                raise SystemExit(
                    f"Expected one occurrence in {filename}, found {count}: {before!r}"
                )
            text = text.replace(before, after)
        patched = text.encode("utf-8")
        (BUILD / filename).write_bytes(patched)
        entries.append(
            {
                "source": filename,
                "target": str(TARGET_PREFIX / filename),
                "original_sha256": actual,
                "patched_sha256": digest(patched),
            }
        )
    (BUILD / "manifest.json").write_text(
        json.dumps({"version": 1, "files": entries}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Built optional-sync RPA web overlay: {BUILD}")


if __name__ == "__main__":
    main()
