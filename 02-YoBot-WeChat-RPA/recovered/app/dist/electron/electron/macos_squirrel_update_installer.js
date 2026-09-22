import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
export class MacOSSquirrelUpdateError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'MacOSSquirrelUpdateError';
    }
}
const DEFAULT_HANDOFF_TIMEOUT_MS = 120_000;
function kickstartSubmittedShipIt(jobLabel) {
    const uid = typeof process.getuid === 'function' ? process.getuid() : null;
    if (!Number.isSafeInteger(uid) || uid < 0)
        return;
    const result = spawnSync('/bin/launchctl', [
        'kickstart',
        `gui/${uid}/${jobLabel}`,
    ], {
        encoding: 'utf8',
        stdio: 'ignore',
        timeout: 5_000,
    });
    if (result.error || result.status !== 0) {
        // Older macOS releases may already have started ShipIt by the time this
        // compatibility kick runs. Native Squirrel remains authoritative there.
        console.warn('[AppUpdater] ShipIt compatibility kickstart was not accepted.');
    }
}
function fail(code, message) {
    throw new MacOSSquirrelUpdateError(code, message);
}
function safeHeaderEqual(actual, expected) {
    if (!actual)
        return false;
    const actualBytes = Buffer.from(actual, 'utf8');
    const expectedBytes = Buffer.from(expected, 'utf8');
    return actualBytes.length === expectedBytes.length
        && crypto.timingSafeEqual(actualBytes, expectedBytes);
}
/**
 * Rehydrate a previously verified ZIP into native Squirrel.Mac without relying
 * on electron-updater's process-local proxy. This is required for the shared
 * next_launch policy, where the verified ZIP survives an Agent restart.
 */
export async function installMacOSUpdateWithSquirrel(options) {
    if ((options.platform ?? process.platform) !== 'darwin'
        || (options.architecture ?? process.arch) !== 'arm64') {
        fail('MACOS_SQUIRREL_TARGET_UNSUPPORTED', 'Mac 原生更新交接仅支持 Darwin arm64');
    }
    if (!path.isAbsolute(options.downloadedFile)
        || path.extname(options.downloadedFile).toLowerCase() !== '.zip') {
        fail('MACOS_SQUIRREL_ARTIFACT_INVALID', 'Mac 原生更新 ZIP 路径无效');
    }
    if (!/^[A-Za-z0-9](?:[A-Za-z0-9.-]{1,253}[A-Za-z0-9])?$/.test(options.bundleIdentifier)
        || !options.bundleIdentifier.includes('.')) {
        fail('MACOS_SQUIRREL_TARGET_UNSUPPORTED', 'Mac 原生更新应用标识无效');
    }
    const timeoutMs = options.timeoutMs ?? DEFAULT_HANDOFF_TIMEOUT_MS;
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 300_000) {
        fail('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新交接超时配置无效');
    }
    const noFollow = typeof fs.constants.O_NOFOLLOW === 'number' ? fs.constants.O_NOFOLLOW : 0;
    let artifact;
    let artifactStat;
    try {
        const pathStat = await fs.promises.lstat(options.downloadedFile);
        if (!pathStat.isFile() || pathStat.isSymbolicLink() || pathStat.size <= 0) {
            fail('MACOS_SQUIRREL_ARTIFACT_INVALID', 'Mac 原生更新 ZIP 不是普通文件');
        }
        artifact = await fs.promises.open(options.downloadedFile, fs.constants.O_RDONLY | noFollow);
        artifactStat = await artifact.stat();
        if (!artifactStat.isFile() || artifactStat.size <= 0) {
            await artifact.close();
            fail('MACOS_SQUIRREL_ARTIFACT_INVALID', 'Mac 原生更新 ZIP 不是普通文件');
        }
    }
    catch (error) {
        if (error instanceof MacOSSquirrelUpdateError)
            throw error;
        fail('MACOS_SQUIRREL_ARTIFACT_INVALID', 'Mac 原生更新 ZIP 无法安全打开');
    }
    const randomBytes = options.randomBytes ?? crypto.randomBytes;
    const password = randomBytes(48).toString('base64url');
    const artifactRoute = `/${randomBytes(32).toString('hex')}.zip`;
    const authorization = `Basic ${Buffer.from(`autoupdater:${password}`, 'ascii').toString('base64')}`;
    await new Promise((resolve, reject) => {
        let settled = false;
        let listening = false;
        let timer = null;
        const server = http.createServer();
        const closeArtifact = () => artifact.close().catch(() => { });
        const finish = (error) => {
            if (settled)
                return;
            settled = true;
            if (timer)
                clearTimeout(timer);
            options.nativeUpdater.removeListener('error', onNativeError);
            options.nativeUpdater.removeListener('update-downloaded', onNativeDownloaded);
            const complete = () => {
                closeArtifact().finally(() => {
                    if (error)
                        reject(error);
                    else
                        resolve();
                });
            };
            if (!listening) {
                complete();
                return;
            }
            if (error)
                server.closeAllConnections?.();
            server.close(complete);
        };
        const onNativeError = () => finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新未接受已验证安装包'));
        const onNativeDownloaded = () => {
            try {
                options.nativeUpdater.quitAndInstall();
                // On macOS 26, launchd can accept Squirrel's submitted job but leave it
                // indefinitely in `pending spawn / on-demand-only` with zero runs.
                // Kicking this app's exact ShipIt label is harmless when an older OS
                // already started it, and preserves Squirrel as the replacement owner.
                (options.kickstartShipIt ?? kickstartSubmittedShipIt)(`${options.bundleIdentifier}.ShipIt`);
                finish();
            }
            catch {
                finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新无法发起退出安装'));
            }
        };
        server.on('request', (request, response) => {
            response.setHeader('Cache-Control', 'no-store');
            response.setHeader('Connection', 'close');
            if (request.url === '/') {
                if (request.method !== 'GET') {
                    response.writeHead(405).end();
                    return;
                }
                if (!safeHeaderEqual(request.headers.authorization, authorization)) {
                    response.writeHead(401).end();
                    return;
                }
                const address = server.address();
                if (!address || address.address !== '127.0.0.1') {
                    response.writeHead(503).end();
                    return;
                }
                const body = Buffer.from(JSON.stringify({
                    url: `http://127.0.0.1:${address.port}${artifactRoute}`,
                }), 'utf8');
                response.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Content-Length': body.length,
                });
                response.end(body);
                return;
            }
            if (request.url !== artifactRoute) {
                response.writeHead(404).end();
                return;
            }
            if (request.method !== 'GET' && request.method !== 'HEAD') {
                response.writeHead(405).end();
                return;
            }
            response.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Length': artifactStat.size,
            });
            if (request.method === 'HEAD') {
                response.end();
                return;
            }
            const stream = artifact.createReadStream({
                start: 0,
                end: artifactStat.size - 1,
                autoClose: false,
            });
            stream.on('error', () => finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新读取已验证安装包失败')));
            stream.pipe(response);
        });
        server.once('error', () => finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新无法建立本机交接通道')));
        options.nativeUpdater.once('error', onNativeError);
        options.nativeUpdater.once('update-downloaded', onNativeDownloaded);
        server.listen(0, '127.0.0.1', () => {
            listening = true;
            const address = server.address();
            if (!address || address.address !== '127.0.0.1') {
                finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新本机交接通道身份无效'));
                return;
            }
            try {
                options.nativeUpdater.setFeedURL({
                    url: `http://127.0.0.1:${address.port}`,
                    headers: { Authorization: authorization, 'Cache-Control': 'no-cache' },
                });
                timer = setTimeout(() => finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_TIMEOUT', 'Mac 原生更新交接超时')), timeoutMs);
                options.nativeUpdater.checkForUpdates();
            }
            catch {
                finish(new MacOSSquirrelUpdateError('MACOS_SQUIRREL_HANDOFF_FAILED', 'Mac 原生更新无法检查本机安装包'));
            }
        });
    });
}
