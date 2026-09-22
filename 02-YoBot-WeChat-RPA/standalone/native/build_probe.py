"""Build the separate, read-only AX diagnostic app; leave shipping RPA intact."""
from pathlib import Path
import plistlib
import subprocess

root = Path(__file__).resolve().parent
app = root / 'YoBot Contacts Diagnostics.app'
contents = app / 'Contents'
executable = contents / 'MacOS' / 'ContactProbe'
executable.parent.mkdir(parents=True, exist_ok=True)
(contents / 'Info.plist').write_bytes(plistlib.dumps({
    'CFBundleExecutable': 'ContactProbe',
    'CFBundleIdentifier': 'local.yobot.contacts-diagnostics',
    'CFBundleName': 'YoBot Contacts Diagnostics',
    'CFBundleDisplayName': 'YoBot Contacts Diagnostics',
    'CFBundlePackageType': 'APPL',
    'CFBundleVersion': '1',
    'LSUIElement': True,
    'NSAccessibilityUsageDescription': '读取微信通讯录控件的类型、焦点和位置，用于修复好友同步；不记录联系人内容。',
}))
subprocess.run(['swiftc', str(root / 'ContactProbe.swift'), '-o', str(executable)], check=True)
subprocess.run(['codesign', '--force', '--sign', '-', str(app)], check=True)
print(app)
