/** Standalone entry: embedded signed RPA plus reconstructed JS application. */
import { app, dialog } from 'electron';
import { startLocalRpaPolicy } from './recovery-local-rpa.js';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

process.env.YOBOT_RECOVERED = '1';
process.env.VITE_BOT_NAME = 'YoBot Recovered';
// Do not inherit another installation's data routing.
delete process.env.USER_DATA_PATH;
delete process.env.YOKO_AGENT_CACHE_PATH;
delete process.env.YOKO_AGENT_LOGS_PATH;
app.setName('YoBot Recovered');
const dataRoot = path.join(os.homedir(), 'Library', 'Application Support', 'YoBot-Recovered');


function inUse(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(false)));
  });
}

function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

function installRpaWebPatch(installedVersion) {
  const patchRoot = path.join(process.resourcesPath, 'rpa-web-patch');
  const manifestPath = path.join(patchRoot, 'manifest.json');
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const installRoot = path.resolve(installedVersion) + path.sep;
  for (const entry of manifest.files ?? []) {
    const source = path.join(patchRoot, entry.source);
    const target = path.resolve(installedVersion, entry.target);
    if (!target.startsWith(installRoot)) throw new Error(`RPA web patch target escapes install root: ${entry.target}`);
    const patched = fs.readFileSync(source);
    if (sha256(patched) !== entry.patched_sha256) throw new Error(`RPA web patch is damaged: ${entry.source}`);
    const current = fs.readFileSync(target);
    const currentHash = sha256(current);
    if (currentHash === entry.patched_sha256) continue;
    if (currentHash !== entry.original_sha256) throw new Error(`RPA web asset is incompatible: ${entry.target}`);
    const staging = target + '.recovery-' + process.pid;
    fs.writeFileSync(staging, patched);
    fs.renameSync(staging, target);
  }
}

function installContactFix(bundledRoot) {
  const manifestName = 'manifest.json';
  const bundledManifest = fs.readFileSync(path.join(bundledRoot, manifestName));
  const manifest = JSON.parse(bundledManifest);
  const installRoot = path.join(dataRoot, 'contact-fix', `${manifest.version}-${manifest.cdhash.slice(0, 12)}`);
  const installedManifest = path.join(installRoot, manifestName);
  const installedBase = path.join(installRoot, 'base_library.zip');
  const bundledBase = fs.readFileSync(path.join(bundledRoot, 'base_library.zip'));
  const needsInstall = !fs.existsSync(installedManifest)
    || !fs.readFileSync(installedManifest).equals(bundledManifest)
    || !fs.existsSync(installedBase)
    || !fs.readFileSync(installedBase).equals(bundledBase);
  if (needsInstall) {
    fs.mkdirSync(path.dirname(installRoot), {recursive: true});
    const staging = installRoot + '.staging-' + process.pid;
    fs.rmSync(staging, {recursive: true, force: true});
    execFileSync('/usr/bin/ditto', [bundledRoot, staging], {stdio: 'pipe'});
    const helper = path.join(staging, manifest.helper_path);
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', helper], {stdio: 'pipe'});
    fs.rmSync(installRoot, {recursive: true, force: true});
    fs.renameSync(staging, installRoot);
  }
  const helper = path.join(installRoot, manifest.helper_path);
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', helper], {stdio: 'pipe'});
  return installRoot;
}

async function bootstrap() {
  if ((await inUse(3000)) || (await inUse(9922))) {
    await app.whenReady();
    await dialog.showMessageBox({type: 'info', title: '启动恢复版',
      message: '请先退出原 YoBot，再打开恢复版。',
      detail: '微信控制器使用同一组本地端口。恢复版不会终止其它应用，也不会读取原账号的登录凭据。',
      buttons: ['知道了']});
    app.quit();
    return;
  }
  const bundledVersion = path.join(process.resourcesPath, 'embedded-rpa', '2.0.0');
  const installedVersion = path.join(dataRoot, 'plugins', 'wechat-rpa', 'versions', '2.0.0');
  if (!fs.existsSync(installedVersion)) {
    const bundle = path.join(bundledVersion, 'YokoWebot RPA Control.app');
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', bundle], {stdio: 'pipe'});
    fs.mkdirSync(path.dirname(installedVersion), {recursive: true});
    const staging = installedVersion + '.staging-' + process.pid;
    execFileSync('/usr/bin/ditto', [bundledVersion, staging], {stdio: 'pipe'});
    execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', path.join(staging, 'YokoWebot RPA Control.app')], {stdio: 'pipe'});
    fs.renameSync(staging, installedVersion);
  }
  installRpaWebPatch(installedVersion);
  const bundledContactFix = path.join(process.resourcesPath, 'contact-fix');
  if (fs.existsSync(path.join(bundledContactFix, 'manifest.json'))) {
    const contactFix = installContactFix(bundledContactFix);
    const source = fs.readFileSync(path.join(contactFix, 'base_library.zip'));
    const target = path.join(installedVersion, 'YokoWebot RPA Control.app', 'Contents', 'Resources', 'base_library.zip');
    if (!fs.readFileSync(target).equals(source)) {
      const staging = target + '.recovery-' + process.pid;
      fs.writeFileSync(staging, source);
      fs.renameSync(staging, target);
    }
    process.env.YOBOT_CONTACT_FIX_ROOT = contactFix;
  }
  await startLocalRpaPolicy();
  console.log('[Recovery] RPA local mode enabled; no commercial activation required');
  await import('./dist/electron/electron/main.js');
}
await bootstrap().catch(async error => {
  console.error('[Recovery] startup failed:', error.message);
  await app.whenReady();
  await dialog.showMessageBox({type:'error', title:'恢复版启动失败', message:error.message, buttons:['关闭']});
  app.quit();
});
