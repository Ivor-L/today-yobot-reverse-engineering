"""Apply small, explicit portability changes to the extracted JavaScript.
Idempotent: original extraction remains untouched; preserve app edits afterwards.
"""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'app'
marker=APP/'.recovery-configured'
if marker.exists():
    print('Already configured');raise SystemExit
layout=APP/'dist/electron/core/platform/file_layout.js'
s=layout.read_text().replace("DEFAULT_MACOS_APP_NAME = 'YoBot'", "DEFAULT_MACOS_APP_NAME = 'YoBot-Recovered'").replace("DEFAULT_MACOS_APP_ID = 'com.yobot.app'", "DEFAULT_MACOS_APP_ID = 'local.yobot.recovered'").replace("LEGACY_AGENT_DIRECTORY = '.yokoagent'", "LEGACY_AGENT_DIRECTORY = '.yobot-recovered-legacy'")
layout.write_text(s)
# Main uses isolated data but retains original service ports for RPA compatibility.
p=APP/'package.json';pkg=json.loads(p.read_text());pkg['main']='recovery-bootstrap.js';p.write_text(json.dumps(pkg,ensure_ascii=False,indent=2))
# Use the full original application server; USER_DATA_PATH is already injected by main.
# Prevent official self-updates from overwriting the locally rebuilt app. Keep RPA policy checks.
p=APP/'dist/electron/electron/main.js';s=p.read_text();s=s.replace('function scheduleAppUpdateCheck(delayMs = 60 * 60 * 1000) {','function scheduleAppUpdateCheck(delayMs = 60 * 60 * 1000) {\n    if (process.env.YOBOT_RECOVERED === "1") return;')
s=s.replace("ipcMain.handle('app:update-check', async () => desktopUpdateManager?.checkForUpdates(false) || null);", "ipcMain.handle('app:update-check', async () => process.env.YOBOT_RECOVERED === '1' ? null : desktopUpdateManager?.checkForUpdates(false) || null);")
p.write_text(s)
# Seeded signed artifacts become pending-health only after a real auth context exists.
p=APP/'dist/electron/electron/macos_plugin_service.js';s=p.read_text();needle='''            let recovered;
            try {
                recovered = await this.lifecycle.recoverAtStartup(secrets, operationAbort.signal);'''
replacement='''            let recovered;
            try {
                if (process.env.YOBOT_RECOVERED === '1' && secrets.rpaToken) {
                    const state = await this.readState();
                    if (!state) {
                        const embedded = await this.store.readInstalledVersion('1.9.19');
                        if (embedded) {
                            await this.lifecycle.manifestFor(embedded);
                            await this.store.activateInstalledVersion('1.9.19', 0);
                        }
                    }
                }
                recovered = await this.lifecycle.recoverAtStartup(secrets, operationAbort.signal);'''
assert needle in s;s=s.replace(needle,replacement);p.write_text(s)
marker.write_text('1\n')
print('Configured isolated data paths and signed embedded plugin startup')
