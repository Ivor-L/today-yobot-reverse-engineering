import { execFileSync as execFileSyncNode, spawn as spawnNode } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { electronBuilderNsisGuid } from './app_update_contract.js';
const MIN_FREE_SPACE_MARGIN = 512 * 1024 * 1024;
function normalizePath(value) {
    return path.resolve(value).replace(/[\\/]+$/, '').toLowerCase();
}
function defaultExecFileSync(file, args) {
    return execFileSyncNode(file, [...args], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: file.toLowerCase().endsWith('reg.exe') ? 5_000 : 15_000,
    });
}
function readInstallLocation(root, appId, platform, execFileSync) {
    if (platform !== 'win32')
        return null;
    const guid = electronBuilderNsisGuid(appId);
    try {
        const output = execFileSync('reg.exe', [
            'query',
            `${root}\\Software\\${guid}`,
            '/v',
            'InstallLocation',
        ]);
        const match = output.match(/^\s*InstallLocation\s+REG_\w+\s+(.+?)\s*$/im);
        return match?.[1]?.trim() || null;
    }
    catch {
        return null;
    }
}
async function sha512OfFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha512');
        const stream = fs.createReadStream(filePath);
        stream.on('data', (chunk) => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('base64')));
    });
}
function publisherMatches(subject, trustedNames, simpleName = '') {
    const normalizeDistinguishedName = (value) => value
        .trim()
        .toLowerCase()
        .replace(/\s*,\s*/g, ',')
        .replace(/\s*=\s*/g, '=');
    const normalizedSubject = normalizeDistinguishedName(subject);
    const normalizedSimpleName = simpleName.trim().toLowerCase();
    const commonNames = Array.from(subject.matchAll(/(?:^|,\s*)CN\s*=\s*([^,]+)/gi))
        .map((match) => match[1].trim().toLowerCase());
    return trustedNames.some((name) => {
        const normalizedPlainName = name.trim().toLowerCase();
        const trustedDistinguishedName = normalizeDistinguishedName(name);
        return normalizedPlainName.includes('=')
            ? normalizedSubject === trustedDistinguishedName
            : normalizedSimpleName === normalizedPlainName || commonNames.includes(normalizedPlainName);
    });
}
export class WindowsNsisUpdateDriver {
    target = { platform: 'win32', architecture: 'x64', artifactType: 'nsis' };
    platform;
    processExecPath;
    processId;
    resourcesPath;
    systemRoot;
    randomBytes;
    run;
    spawn;
    constructor(dependencies = {}) {
        this.platform = dependencies.platform ?? process.platform;
        this.processExecPath = dependencies.processExecPath ?? process.execPath;
        this.processId = dependencies.processId ?? process.pid;
        this.resourcesPath = dependencies.resourcesPath ?? process.resourcesPath;
        this.systemRoot = dependencies.systemRoot ?? process.env.SystemRoot ?? 'C:\\Windows';
        this.randomBytes = dependencies.randomBytes ?? crypto.randomBytes;
        this.run = dependencies.execFileSync ?? defaultExecFileSync;
        this.spawn = dependencies.spawn ?? ((file, args) => spawnNode(file, [...args], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
        }));
    }
    async inspectEnvironment(request) {
        if (this.platform !== 'win32') {
            return {
                ok: false,
                scope: 'unknown',
                installLocation: null,
                requiresElevation: false,
                error: '当前自动安装仅支持 Windows。',
            };
        }
        const perUser = readInstallLocation('HKCU', request.appId, this.platform, this.run);
        const perMachine = readInstallLocation('HKLM', request.appId, this.platform, this.run);
        if (perUser && perMachine) {
            return {
                ok: false,
                scope: 'unknown',
                installLocation: null,
                requiresElevation: false,
                error: '检测到当前用户和所有用户两份安装，已停止静默升级，请先使用修复安装清理重复版本。',
            };
        }
        const installLocation = perUser || perMachine;
        const scope = perMachine ? 'machine' : perUser ? 'user' : 'unknown';
        if (!installLocation) {
            return {
                ok: false,
                scope,
                installLocation: null,
                requiresElevation: false,
                error: '未找到原安装目录注册信息，已停止静默升级以避免安装到错误目录。',
            };
        }
        if (/[^\x00-\x7f]/.test(installLocation)) {
            return {
                ok: false,
                scope,
                installLocation,
                requiresElevation: false,
                error: '原安装目录包含非 ASCII 字符，需要通过修复安装迁移到兼容目录。',
            };
        }
        if (!fs.existsSync(installLocation)) {
            return {
                ok: false,
                scope,
                installLocation,
                requiresElevation: false,
                error: `原安装目录不可访问：${installLocation}`,
            };
        }
        if (normalizePath(installLocation) !== normalizePath(path.dirname(this.processExecPath))) {
            return {
                ok: false,
                scope,
                installLocation,
                requiresElevation: false,
                error: '当前运行目录与注册表安装目录不一致，已停止静默升级以避免产生第二份客户端。',
            };
        }
        if (!fs.existsSync(request.downloadedFile)) {
            return {
                ok: false,
                scope,
                installLocation,
                requiresElevation: false,
                error: '已下载的更新包不存在，需要重新下载。',
            };
        }
        let requiresElevation = scope === 'machine';
        const writeProbe = path.join(installLocation, `.yoko-update-write-${this.processId}-${this.randomBytes(6).toString('hex')}.tmp`);
        try {
            fs.writeFileSync(writeProbe, '', { flag: 'wx' });
        }
        catch (error) {
            const code = error && typeof error === 'object' && 'code' in error
                ? String(error.code || '')
                : '';
            if (code === 'EACCES' || code === 'EPERM') {
                // Legacy per-user installs under ProgramData still require UAC.
                requiresElevation = true;
            }
            else {
                return {
                    ok: false,
                    scope,
                    installLocation,
                    requiresElevation: false,
                    error: `无法验证安装目录写入权限：${error instanceof Error ? error.message : String(error)}`,
                };
            }
        }
        finally {
            try {
                fs.unlinkSync(writeProbe);
            }
            catch { /* probe may not have been created */ }
        }
        try {
            const stats = fs.statfsSync(installLocation);
            const freeBytes = Number(stats.bavail) * Number(stats.bsize);
            const required = Math.max(request.expectedSize, fs.statSync(request.downloadedFile).size) * 2
                + MIN_FREE_SPACE_MARGIN;
            if (freeBytes < required) {
                return {
                    ok: false,
                    scope,
                    installLocation,
                    requiresElevation,
                    error: `磁盘空间不足，至少还需要 ${(required / 1024 / 1024).toFixed(0)} MB 可用空间。`,
                };
            }
        }
        catch (error) {
            return {
                ok: false,
                scope,
                installLocation,
                requiresElevation,
                error: `无法检查安装目录磁盘空间：${error instanceof Error ? error.message : String(error)}`,
            };
        }
        return { ok: true, scope, installLocation, requiresElevation };
    }
    async verifyArtifact(request) {
        let actualSha512;
        try {
            actualSha512 = await sha512OfFile(request.downloadedFile);
        }
        catch (error) {
            return {
                ok: false,
                discardArtifact: true,
                error: `无法读取更新包进行 SHA512 校验：${error instanceof Error ? error.message : String(error)}`,
            };
        }
        if (actualSha512 !== request.expectedSha512) {
            return {
                ok: false,
                discardArtifact: true,
                error: '更新包 SHA512 校验失败，已清除待安装状态，请重新下载。',
            };
        }
        if (request.trustedPublisherNames.length === 0) {
            return { ok: true, discardArtifact: false };
        }
        const signature = this.verifyAuthenticode(request.downloadedFile, request.trustedPublisherNames);
        return signature.ok
            ? { ok: true, discardArtifact: false }
            : { ok: false, discardArtifact: false, error: signature.error || '更新包 Authenticode 验证失败。' };
    }
    async launchInstaller(request) {
        if (this.platform !== 'win32')
            throw new Error('当前自动安装仅支持 Windows。');
        const installerArgs = ['--updated', '/S', '--force-run'];
        const executable = request.requiresElevation
            ? path.join(this.resourcesPath, 'elevate.exe')
            : request.downloadedFile;
        const args = request.requiresElevation
            ? [request.downloadedFile, ...installerArgs]
            : installerArgs;
        const child = this.spawn(executable, args);
        await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, 2_000);
            child.once('spawn', () => {
                clearTimeout(timer);
                resolve();
            });
            child.once('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
        child.unref();
        return { quitHandledByDriver: false };
    }
    powershellExe() {
        return path.join(this.systemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    }
    verifyAuthenticode(filePath, publisherNames) {
        if (publisherNames.length === 0) {
            return { ok: false, error: '自动安装尚未配置可信代码签名发布者，请使用手动更新。' };
        }
        const command = [
            `$sig = Get-AuthenticodeSignature -LiteralPath '${filePath.replace(/'/g, "''")}'`,
            '$subject = if ($sig.SignerCertificate) { $sig.SignerCertificate.Subject } else { "" }',
            '$simple = if ($sig.SignerCertificate) { $sig.SignerCertificate.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false) } else { "" }',
            '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8',
            'Write-Output ($sig.Status.ToString() + "|" + $simple + "|" + $subject)',
        ].join('; ');
        try {
            const encoded = Buffer.from(command, 'utf16le').toString('base64');
            const output = this.run(this.powershellExe(), [
                '-NoProfile',
                '-NonInteractive',
                '-EncodedCommand',
                encoded,
            ]).trim();
            const [status, simpleName = '', subject = ''] = output.split('|', 3);
            if (status !== 'Valid')
                return { ok: false, error: `更新包数字签名无效：${status || 'Unknown'}` };
            if (!publisherMatches(subject, publisherNames, simpleName)) {
                return { ok: false, error: `更新包签名发布者不匹配：${subject || 'Unknown'}` };
            }
            return { ok: true };
        }
        catch (error) {
            return {
                ok: false,
                error: `无法验证更新包数字签名：${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
