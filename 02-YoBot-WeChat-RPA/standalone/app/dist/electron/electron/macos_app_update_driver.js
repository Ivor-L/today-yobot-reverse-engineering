import { execFile as execFileCallback } from 'node:child_process';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { extractPluginArchiveSecurely, removeOwnedPluginArchiveStaging, withRawArchiveFilesystem, } from './plugin_archive.js';
const execFileAsync = promisify(execFileCallback);
export const MACOS_AGENT_BUNDLE_ID = 'com.yobot.app';
export const MACOS_AGENT_BUNDLE_NAME = 'YoBot.app';
export const MACOS_AGENT_EXECUTABLE_NAME = 'YoBot';
export const MACOS_AGENT_TEAM_ID = '2M27ML4PY2';
export const MACOS_AGENT_CHANNEL_ID = 'agent_generic';
export const MACOS_AGENT_MINIMUM_SYSTEM_VERSION = '13.0';
export const MACOS_AGENT_UPDATE_FEED_URL = 'https://dl.yokoagi.com/yobot-package/updates/agent_generic/darwin-arm64';
const MAX_PLIST_BYTES = 256 * 1024;
const MAX_ENVIRONMENT_BYTES = 256 * 1024;
const MAX_BUNDLE_FILES = 75_000;
const MAX_MACHO_FILES = 10_000;
const APP_ARCHIVE_LIMITS = Object.freeze({
    maxEntries: 75_000,
    maxUncompressedBytes: 8 * 1024 * 1024 * 1024,
    maxEntryBytes: 2 * 1024 * 1024 * 1024,
    maxCompressionRatio: 200,
});
const MACHO_MAGICS = new Set([
    'cefaedfe', 'feedface', 'cffaedfe', 'feedfacf',
    'cafebabe', 'cafebabf', 'bebafeca', 'bfbafeca',
]);
export class MacOSAppUpdatePreflightError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'MacOSAppUpdatePreflightError';
    }
}
function fail(code, message) {
    throw new MacOSAppUpdatePreflightError(code, message);
}
function numericVersion(value) {
    if (typeof value !== 'string' || !/^\d+(?:\.\d+){1,3}$/.test(value))
        return null;
    const parts = value.split('.').map(Number);
    return parts.every((part) => Number.isSafeInteger(part)) ? parts : null;
}
function compareNumericVersions(left, right) {
    const a = numericVersion(left);
    const b = numericVersion(right);
    if (!a || !b)
        fail('invalid-request', 'Mac 应用更新系统版本格式无效');
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference !== 0)
            return difference > 0 ? 1 : -1;
    }
    return 0;
}
function decodeSha512(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(value))
        return null;
    const decoded = Buffer.from(value, 'base64');
    if (decoded.length !== 64
        || decoded.toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, ''))
        return null;
    return decoded;
}
async function sha512OfFile(filePath) {
    const digest = crypto.createHash('sha512');
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream)
        digest.update(chunk);
    return digest.digest();
}
async function defaultExecFile(file, args) {
    const result = await execFileAsync(file, [...args], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: 120_000,
    });
    return { stdout: result.stdout, stderr: result.stderr };
}
async function runChecked(run, code, label, file, args) {
    try {
        return await run(file, args);
    }
    catch {
        fail(code, `Mac 应用更新${label}验证失败`);
    }
}
function requiredPlistString(plist, key, code) {
    const value = plist[key];
    if (typeof value !== 'string' || !value || value.length > 256) {
        fail(code, `Mac 应用更新 App 缺少固定的 ${key}`);
    }
    return value;
}
async function readPlist(bundlePath, run, code) {
    const plistPath = path.join(bundlePath, 'Contents', 'Info.plist');
    const stat = await fs.promises.lstat(plistPath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_PLIST_BYTES) {
        fail(code, 'Mac 应用更新 App 的 Info.plist 缺失或大小无效');
    }
    const result = await runChecked(run, code, ' Info.plist', '/usr/bin/plutil', [
        '-convert', 'json', '-o', '-', plistPath,
    ]);
    try {
        const parsed = JSON.parse(result.stdout);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
            throw new Error('not a dictionary');
        return parsed;
    }
    catch {
        fail(code, 'Mac 应用更新 App 的 Info.plist 不是有效字典');
    }
}
function assertSigningDetails(rawDetails, code) {
    const lines = rawDetails.split(/\r?\n/).map((line) => line.trim());
    if (!lines.includes(`Identifier=${MACOS_AGENT_BUNDLE_ID}`)
        || !lines.includes(`TeamIdentifier=${MACOS_AGENT_TEAM_ID}`)
        || !lines.some((line) => line.startsWith('Authority=Developer ID Application:'))
        || !lines.some((line) => /(?:^|\s)flags=0x[0-9a-f]+\(runtime\)(?:\s|$)/i.test(line))) {
        fail(code, 'Mac 应用更新 App 的 Developer ID、Team 或 hardened runtime 不匹配');
    }
}
function entitlementIsTrue(source, key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`<key>\\s*${escaped}\\s*</key>\\s*<true\\s*/>`, 'i').test(source);
}
function entitlementIsPresent(source, key) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`<key>\\s*${escaped}\\s*</key>`, 'i').test(source);
}
function assertEntitlements(source, code) {
    const required = [
        'com.apple.security.cs.allow-jit',
        'com.apple.security.cs.allow-unsigned-executable-memory',
    ];
    const forbidden = [
        'com.apple.security.app-sandbox',
        'com.apple.security.cs.disable-library-validation',
        'com.apple.security.get-task-allow',
    ];
    if (required.some((key) => !entitlementIsTrue(source, key))
        || forbidden.some((key) => entitlementIsPresent(source, key))) {
        fail(code, 'Mac 应用更新 App 的签名 entitlement 不符合正式包策略');
    }
}
async function requireRegularFile(filePath, code, message) {
    const stat = await fs.promises.lstat(filePath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink())
        fail(code, message);
    return stat;
}
function parsePackagedEnvironment(source) {
    const values = new Map();
    for (const rawLine of source.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#'))
            continue;
        const separator = line.indexOf('=');
        if (separator <= 0)
            continue;
        const key = line.slice(0, separator).trim();
        let value = line.slice(separator + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"'))
            || (value.startsWith("'") && value.endsWith("'")))
            value = value.slice(1, -1);
        values.set(key, value);
    }
    return values;
}
async function assertDistributionResources(bundlePath, code) {
    const environmentPath = path.join(bundlePath, 'Contents', 'Resources', '.env');
    const trayIconPath = path.join(bundlePath, 'Contents', 'Resources', 'tray-icon.png');
    const environmentStat = await requireRegularFile(environmentPath, code, 'Mac 应用更新 App 缺少正式渠道环境文件');
    await requireRegularFile(trayIconPath, code, 'Mac 应用更新 App 缺少托盘图标');
    if (environmentStat.size <= 0 || environmentStat.size > MAX_ENVIRONMENT_BYTES) {
        fail(code, 'Mac 应用更新 App 的渠道环境文件大小无效');
    }
    let source;
    try {
        source = await fs.promises.readFile(environmentPath, 'utf8');
    }
    catch {
        fail(code, 'Mac 应用更新 App 的渠道环境文件不可验证');
    }
    const environment = parsePackagedEnvironment(source);
    if (environment.get('VITE_CHANNEL_ID') !== MACOS_AGENT_CHANNEL_ID
        || environment.get('VITE_APP_ID') !== MACOS_AGENT_BUNDLE_ID
        || environment.get('APP_UPDATE_FEED_URL') !== MACOS_AGENT_UPDATE_FEED_URL) {
        fail(code, 'Mac 应用更新 App 的渠道环境与正式发布目标不匹配');
    }
}
async function collectMachOFiles(bundlePath, code) {
    const pending = [bundlePath];
    const machoFiles = [];
    let fileCount = 0;
    while (pending.length > 0) {
        const current = pending.pop();
        let entries;
        try {
            entries = await fs.promises.readdir(current, { withFileTypes: true });
        }
        catch {
            fail(code, 'Mac 应用更新 App 的文件树不可验证');
        }
        for (const entry of entries) {
            const candidate = path.join(current, entry.name);
            let stat;
            try {
                stat = await fs.promises.lstat(candidate);
            }
            catch {
                fail(code, 'Mac 应用更新 App 的文件树不可验证');
            }
            if (stat.isSymbolicLink())
                continue;
            if (stat.isDirectory()) {
                pending.push(candidate);
                continue;
            }
            if (!stat.isFile())
                fail(code, 'Mac 应用更新 App 包含不支持的原生文件类型');
            fileCount += 1;
            if (fileCount > MAX_BUNDLE_FILES)
                fail(code, 'Mac 应用更新 App 文件数量超过验证限制');
            if (stat.size < 4)
                continue;
            const magic = Buffer.allocUnsafe(4);
            try {
                const handle = await fs.promises.open(candidate, 'r');
                try {
                    await handle.read(magic, 0, 4, 0);
                }
                finally {
                    await handle.close();
                }
            }
            catch {
                fail(code, 'Mac 应用更新 App 的原生文件不可验证');
            }
            if (MACHO_MAGICS.has(magic.toString('hex'))) {
                machoFiles.push(candidate);
                if (machoFiles.length > MAX_MACHO_FILES) {
                    fail(code, 'Mac 应用更新 App 的 Mach-O 数量超过验证限制');
                }
            }
        }
    }
    return machoFiles;
}
async function assertBundleDirectory(bundlePath, code) {
    for (const requiredDirectory of [
        bundlePath,
        path.join(bundlePath, 'Contents'),
        path.join(bundlePath, 'Contents', 'MacOS'),
        path.join(bundlePath, 'Contents', 'Resources'),
    ]) {
        const stat = await fs.promises.lstat(requiredDirectory).catch(() => null);
        if (!stat?.isDirectory() || stat.isSymbolicLink()) {
            fail(code, 'Mac 应用更新 App 固定 Bundle 布局缺失或包含 symlink');
        }
    }
}
async function verifyBundle(bundlePath, expectation, dependencies) {
    const { errorCode: code } = expectation;
    if (!path.isAbsolute(bundlePath) || path.basename(bundlePath) !== MACOS_AGENT_BUNDLE_NAME) {
        fail(code, 'Mac 应用更新 App 路径与固定产品名称不匹配');
    }
    await assertBundleDirectory(bundlePath, code);
    const plist = await readPlist(bundlePath, dependencies.execFile, code);
    const executableName = requiredPlistString(plist, 'CFBundleExecutable', code);
    const bundleVersion = requiredPlistString(plist, 'CFBundleVersion', code);
    const exactPairs = [
        [plist.CFBundleIdentifier, MACOS_AGENT_BUNDLE_ID],
        [executableName, MACOS_AGENT_EXECUTABLE_NAME],
        [plist.CFBundleShortVersionString, expectation.version],
        [plist.LSMinimumSystemVersion, MACOS_AGENT_MINIMUM_SYSTEM_VERSION],
        [plist.YokoBuildChannel, MACOS_AGENT_CHANNEL_ID],
        [plist.YokoExpectedTeamIdentifier, MACOS_AGENT_TEAM_ID],
    ];
    if (exactPairs.some(([actual, expected]) => actual !== expected)
        || executableName !== path.basename(executableName)) {
        fail(code, 'Mac 应用更新 App 的 Bundle、版本或构建策略不匹配');
    }
    const executablePath = path.join(bundlePath, 'Contents', 'MacOS', executableName);
    const executableStat = await requireRegularFile(executablePath, code, 'Mac 应用更新 App 主程序缺失或是 symlink');
    if (!await dependencies.executableModeProbe(executablePath, executableStat)) {
        fail(code, 'Mac 应用更新 App 主程序没有 Unix executable bit');
    }
    await assertDistributionResources(bundlePath, code);
    await runChecked(dependencies.execFile, code, ' codesign 完整性', '/usr/bin/codesign', [
        '--verify', '--deep', '--strict', '--verbose=2', bundlePath,
    ]);
    const signature = await runChecked(dependencies.execFile, code, '签名身份', '/usr/bin/codesign', [
        '-dv', '--verbose=4', bundlePath,
    ]);
    assertSigningDetails(`${signature.stdout}\n${signature.stderr}`, code);
    const entitlements = await runChecked(dependencies.execFile, code, ' entitlement', '/usr/bin/codesign', [
        '-d', '--entitlements', ':-', bundlePath,
    ]);
    assertEntitlements(`${entitlements.stdout}\n${entitlements.stderr}`, code);
    const machoFiles = expectation.fullDistributionValidation
        ? await collectMachOFiles(bundlePath, code)
        : [executablePath];
    if (machoFiles.length === 0)
        fail(code, 'Mac 应用更新 App 不包含可验证的 Mach-O');
    for (const machoFile of machoFiles) {
        const result = await runChecked(dependencies.execFile, code, ' Mach-O 架构', '/usr/bin/lipo', [
            '-archs', machoFile,
        ]);
        const architectures = result.stdout.trim().split(/\s+/).filter(Boolean);
        if (architectures.length !== 1 || architectures[0] !== 'arm64') {
            fail(code, 'Mac 应用更新 App 包含非 arm64 或 universal Mach-O');
        }
    }
    if (expectation.fullDistributionValidation) {
        await runChecked(dependencies.execFile, code, ' Gatekeeper', '/usr/sbin/spctl', [
            '--assess', '--type', 'execute', '--verbose=4', bundlePath,
        ]);
        await runChecked(dependencies.execFile, code, '公证票据', '/usr/bin/xcrun', [
            'stapler', 'validate', bundlePath,
        ]);
    }
    return {
        bundleIdentifier: MACOS_AGENT_BUNDLE_ID,
        teamIdentifier: MACOS_AGENT_TEAM_ID,
        channelId: MACOS_AGENT_CHANNEL_ID,
        version: expectation.version,
        bundleVersion,
        minimumSystemVersion: MACOS_AGENT_MINIMUM_SYSTEM_VERSION,
        architecture: 'arm64',
        machoFileCount: machoFiles.length,
        hardenedRuntime: true,
        gatekeeperAccepted: true,
        notarizationStapled: true,
    };
}
/** Resolve the signed application bundle from Electron's packaged executable path. */
export function resolveMacOSAppBundleFromExecutable(executablePath) {
    if (!path.isAbsolute(executablePath) || path.resolve(executablePath) !== executablePath
        || path.basename(executablePath) !== MACOS_AGENT_EXECUTABLE_NAME
        || path.basename(path.dirname(executablePath)) !== 'MacOS'
        || path.basename(path.dirname(path.dirname(executablePath))) !== 'Contents') {
        fail('current-app-invalid', '当前 Mac App 主程序路径不符合固定 Bundle 布局');
    }
    const bundlePath = path.dirname(path.dirname(path.dirname(executablePath)));
    if (path.basename(bundlePath) !== MACOS_AGENT_BUNDLE_NAME) {
        fail('current-app-invalid', '当前 Mac App 主程序路径不符合固定 Bundle 布局');
    }
    return bundlePath;
}
function isPathInside(root, candidate) {
    const relative = path.relative(root, candidate);
    return relative === '' || (!relative.startsWith(`..${path.sep}`)
        && relative !== '..' && !path.isAbsolute(relative));
}
function validateRequest(request) {
    const { manifest } = request;
    if (!path.isAbsolute(request.downloadedFile)
        || !path.isAbsolute(request.stagingDirectory)
        || path.extname(request.downloadedFile).toLowerCase() !== '.zip'
        || !numericVersion(request.currentVersion)
        || manifest.schema_version !== 2
        || manifest.platform !== 'darwin'
        || manifest.architecture !== 'arm64'
        || manifest.artifact_type !== 'zip'
        || manifest.channel_id !== MACOS_AGENT_CHANNEL_ID
        || manifest.app_id !== MACOS_AGENT_BUNDLE_ID
        || manifest.bundle_id !== MACOS_AGENT_BUNDLE_ID
        || manifest.signing_identity !== MACOS_AGENT_TEAM_ID
        || manifest.minimum_os_version !== MACOS_AGENT_MINIMUM_SYSTEM_VERSION
        || !numericVersion(manifest.version)
        || !Number.isSafeInteger(manifest.file_size)
        || manifest.file_size <= 0
        || !decodeSha512(manifest.sha512)) {
        fail('invalid-request', 'Mac 应用更新请求与 Manifest v2 固定目标不匹配');
    }
}
async function validateArtifact(request) {
    const stat = await fs.promises.lstat(request.downloadedFile).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink() || stat.size !== request.manifest.file_size) {
        fail('artifact-invalid', 'Mac 应用更新 ZIP 缺失、类型或大小不匹配');
    }
    let actual;
    try {
        actual = await sha512OfFile(request.downloadedFile);
    }
    catch {
        fail('artifact-invalid', 'Mac 应用更新 ZIP 无法执行 SHA512 校验');
    }
    const expected = decodeSha512(request.manifest.sha512);
    if (!expected || !crypto.timingSafeEqual(actual, expected)) {
        fail('artifact-invalid', 'Mac 应用更新 ZIP 的 SHA512 不匹配');
    }
}
/**
 * Validate an electron-updater ZIP and both application identities without
 * installing, moving, launching or modifying either App Bundle.
 */
export async function preflightMacOSAppUpdate(request, dependencies = {}) {
    if ((dependencies.platform ?? process.platform) !== 'darwin'
        || (dependencies.architecture ?? process.arch) !== 'arm64') {
        fail('unsupported-target', 'Mac 应用更新预检仅支持 Darwin arm64');
    }
    validateRequest(request);
    const run = dependencies.execFile ?? defaultExecFile;
    let systemVersion = dependencies.systemVersion;
    if (!systemVersion) {
        try {
            systemVersion = (await run('/usr/bin/sw_vers', ['-productVersion'])).stdout.trim();
        }
        catch {
            fail('invalid-request', '无法确认当前 macOS 系统版本');
        }
    }
    if (!numericVersion(systemVersion)
        || compareNumericVersions(systemVersion, request.manifest.minimum_os_version) < 0) {
        fail('unsupported-target', `当前 macOS 低于应用更新要求的 ${MACOS_AGENT_MINIMUM_SYSTEM_VERSION}`);
    }
    const executableModeProbe = dependencies.executableModeProbe
        ?? ((_filePath, stat) => (stat.mode & 0o111) !== 0);
    const bundleDependencies = { execFile: run, executableModeProbe };
    const currentBundle = resolveMacOSAppBundleFromExecutable(request.currentExecutable);
    if (isPathInside(currentBundle, request.downloadedFile)
        || isPathInside(currentBundle, request.stagingDirectory)
        || isPathInside(request.stagingDirectory, currentBundle)
        || isPathInside(request.stagingDirectory, request.downloadedFile)) {
        fail('invalid-request', 'Mac 应用更新下载、staging 与当前 App 路径必须彼此隔离');
    }
    await verifyBundle(currentBundle, {
        version: request.currentVersion,
        fullDistributionValidation: false,
        errorCode: 'current-app-invalid',
    }, bundleDependencies);
    await validateArtifact(request);
    const stagingBefore = await fs.promises.lstat(request.stagingDirectory).catch((error) => {
        if (error.code === 'ENOENT')
            return null;
        fail('archive-invalid', 'Mac 应用更新 staging 路径不可验证');
    });
    if (stagingBefore)
        fail('archive-invalid', 'Mac 应用更新 staging 必须由本事务全新创建');
    // Resolve the packaged dependency while ASAR support is still enabled. The
    // raw filesystem transaction below must only touch the candidate bundle.
    const extractZip = dependencies.extractZip ?? (await import('extract-zip')).default;
    let ownsStaging = false;
    let verified;
    await withRawArchiveFilesystem(async () => {
        try {
            let extracted;
            try {
                extracted = await extractPluginArchiveSecurely({
                    zipPath: request.downloadedFile,
                    stagingDir: request.stagingDirectory,
                    expectedEntrypoint: MACOS_AGENT_BUNDLE_NAME,
                    limits: APP_ARCHIVE_LIMITS,
                    extractFn: extractZip,
                });
                ownsStaging = true;
            }
            catch {
                fail('archive-invalid', 'Mac 应用更新 ZIP 安全解包验证失败');
            }
            verified = await verifyBundle(extracted.entrypointPath, {
                version: request.manifest.version,
                fullDistributionValidation: true,
                errorCode: 'candidate-app-invalid',
            }, bundleDependencies);
        }
        finally {
            if (ownsStaging) {
                try {
                    await removeOwnedPluginArchiveStaging(request.stagingDirectory);
                }
                catch {
                    fail('staging-cleanup-failed', 'Mac 应用更新临时验证目录清理失败');
                }
            }
        }
    });
    if (!verified)
        fail('candidate-app-invalid', 'Mac 应用更新 App 未完成身份验证');
    return verified;
}
