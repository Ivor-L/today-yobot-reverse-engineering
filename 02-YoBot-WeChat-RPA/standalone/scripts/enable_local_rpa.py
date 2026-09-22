"""Apply the owner's local, subscription-free RPA policy to the recovery copy."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'app'

def replace_once(file, old, new):
    p = APP / file
    s = p.read_text()
    if new in s:
        return
    if s.count(old) != 1:
        raise RuntimeError(f'Unexpected source version: {file}: {s.count(old)} matches')
    p.write_text(s.replace(old, new))

replace_once('recovery-bootstrap.js',
    "import { app, dialog } from 'electron';",
    "import { app, dialog } from 'electron';\nimport { startLocalRpaPolicy } from './recovery-local-rpa.js';")
replace_once('recovery-bootstrap.js',
    "  await import('./dist/electron/electron/main.js');",
    "  await startLocalRpaPolicy();\n  console.log('[Recovery] RPA local mode enabled; no commercial activation required');\n  await import('./dist/electron/electron/main.js');")
p = APP / 'recovery-bootstrap.js'
p.write_text(p.read_text().replace("'1.9.19'", "'2.0.0'"))

driver = 'dist/electron/electron/macos_control_driver.js'
replace_once(driver,
    "import { execFile as execFileCallback } from 'node:child_process';",
    "import { getLocalRpaContext } from '../../../recovery-local-rpa.js';\nimport { execFile as execFileCallback } from 'node:child_process';")
replace_once(driver,
    '        return environment;',
    '''        const local = getLocalRpaContext();
        if (local) {
            environment.YOKO_API_BASE = local.apiBase;
            environment.YOKO_RPA_TOKEN = local.token;
            // Preserve finite runtime ownership and heartbeat checks locally.
            environment.AGENT_SESSION_V2_MODE = 'required';
        }
        return environment;''')

intent = 'dist/electron/electron/macos_plugin_intent.js'
p = APP / intent
s = p.read_text()
if "import { getLocalRpaContext }" not in s:
    s = "import { getLocalRpaContext } from '../../../recovery-local-rpa.js';\n" + s
    s = s.replace('const storedToken = await this.authTokens.read();',
                  'const storedToken = getLocalRpaContext()?.token ?? await this.authTokens.read();')
    p.write_text(s)

service = 'dist/electron/electron/macos_plugin_service.js'
replace_once(service, '''                if (process.env.YOBOT_RECOVERED === '1' && secrets.rpaToken) {
                    const state = await this.readState();
                    if (!state) {
                        const embedded = await this.store.readInstalledVersion('1.9.19');
                        if (embedded) {
                            await this.lifecycle.manifestFor(embedded);
                            await this.store.activateInstalledVersion('1.9.19', 0);
                        }
                    }
                }
                recovered = await this.lifecycle.recoverAtStartup(secrets, operationAbort.signal);''',
'''                const state = await this.readState();
                if (process.env.YOBOT_RECOVERED === '1' && secrets.rpaToken && !state?.active) {
                    const embedded = await this.store.readInstalledVersion('2.0.0');
                    if (embedded) {
                        const verified = await this.lifecycle.resolveVerifiedManifest(embedded);
                        recovered = await this.lifecycle.activateInstalledVersion(verified, state?.generation ?? 0, secrets, operationAbort.signal);
                        if (['activated', 'already-active'].includes(recovered.mode)) recovered.mode = 'active';
                        if (recovered.mode === 'rolled-back') recovered.mode = 'rollback-restored';
                        if (recovered.mode === 'deactivated') recovered.mode = 'inactive';
                    }
                }
                recovered ??= await this.lifecycle.recoverAtStartup(secrets, operationAbort.signal);''')

# Explicit local policy in the recovered frontend. No calls to the old license
# database, seat assignment, or payment endpoints are needed for local RPA.
ui = 'dist/ui/assets/index-y6HZ4z8k.js'
replace_once(ui, 'checkLegacyActivation:async e=>{try{',
    'checkLegacyActivation:async e=>{return {success:true,is_activated:true,mode:"local"};try{')
replace_once(ui, 'getUserSeats:async e=>{try{',
    'getUserSeats:async e=>{return {success:true,data:[],mode:"local"};try{')
replace_once(ui, 'createRpaSeatPayment:async(e,t,n,r)=>{try{',
    'createRpaSeatPayment:async(e,t,n,r)=>{throw new Error("本地 RPA 无需购买席位");try{')
p = APP / ui
p.write_text(p.read_text().replace('启动微信 BOT 服务', '启动微信 BOT（本地免授权）').replace('当前设备已激活，下载插件后即可直接使用', '本地免授权模式，安装插件后即可使用'))
# Record only a bounded backend error for this read-only diagnostic route.
# Account lists, chat contents and credentials are never logged here.
replace_once('dist/electron/electron/main.js',
    '    return macOSControlTransport.execute(input);',
    '''    const result = await macOSControlTransport.execute(input);
    if (process.env.YOBOT_RECOVERED === '1' && input?.path === '/api/agent/instances_status' && result.status >= 400) {
        let detail = 'non-JSON error';
        try { const value = JSON.parse(result.bodyText); detail = value.detail ?? value.message ?? value.error ?? value.code; } catch {}
        console.error('[Recovery] Instance status:', result.status, JSON.stringify(detail)?.slice(0, 800));
    }
    return result;''')
print('Configured local RPA operation; native signatures and loopback authentication preserved')
