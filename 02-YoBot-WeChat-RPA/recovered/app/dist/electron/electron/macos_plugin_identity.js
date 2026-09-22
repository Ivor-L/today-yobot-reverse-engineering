import { execFile as execFileCallback } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { promisify } from 'node:util';
import { RPA_MACOS_BUNDLE_NAME, RPA_MACOS_CONTROL_BUNDLE_ID, RPA_MACOS_HELPER_BUNDLE_ID, RPA_MACOS_HELPER_RELATIVE_PATH, RPA_MACOS_TEAM_ID, } from './plugin_manifest.js';
const execFileAsync = promisify(execFileCallback);
const MAX_PLIST_BYTES = 256 * 1024;
const MAX_STAPLED_TICKET_BYTES = 1024 * 1024;
const MAX_BUNDLE_FILES = 50_000;
const MAX_MACHO_FILES = 5_000;
const MACHO_MAGICS = new Set([
    'cefaedfe', 'feedface', 'cffaedfe', 'feedfacf',
    'cafebabe', 'cafebabf', 'bebafeca', 'bfbafeca',
]);
export class MacOSPluginIdentityError extends Error {
    code;
    constructor(message, code = 'MACOS_PLUGIN_IDENTITY_INVALID') {
        super(message);
        this.name = 'MacOSPluginIdentityError';
        this.code = code;
    }
}
function commandFailureCode(stage) {
    if (stage === 'Info.plist')
        return 'MACOS_PLUGIN_PLIST_FAILED';
    if (stage === 'Mach-O 架构')
        return 'MACOS_PLUGIN_ARCHITECTURE_FAILED';
    if (stage === 'Gatekeeper')
        return 'MACOS_PLUGIN_GATEKEEPER_FAILED';
    if (stage === '公证票据')
        return 'MACOS_PLUGIN_NOTARIZATION_TICKET_FAILED';
    if (stage === 'codesign 完整性' || stage.endsWith('签名身份')) {
        return 'MACOS_PLUGIN_CODESIGN_FAILED';
    }
    return 'MACOS_PLUGIN_IDENTITY_INVALID';
}
function numericVersion(value) {
    if (!/^\d+(?:\.\d+){1,3}$/.test(value))
        return null;
    return value.split('.').map(Number);
}
function compareNumericVersions(left, right) {
    const a = numericVersion(left);
    const b = numericVersion(right);
    if (!a || !b)
        throw new MacOSPluginIdentityError('macOS 系统版本格式无效');
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference !== 0)
            return difference > 0 ? 1 : -1;
    }
    return 0;
}
async function defaultExecFile(file, args) {
    const result = await execFileAsync(file, [...args], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: 120_000,
    });
    return { stdout: result.stdout, stderr: result.stderr };
}
async function runChecked(run, stage, file, args) {
    try {
        return await run(file, args);
    }
    catch {
        throw new MacOSPluginIdentityError(`Mac 插件 ${stage} 验证失败`, commandFailureCode(stage));
    }
}
async function runCheckedWithRetries(run, sleep, attempts, stage, file, args) {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await run(file, args);
        }
        catch {
            if (attempt === attempts) {
                throw new MacOSPluginIdentityError(`Mac 插件 ${stage} 验证失败`, commandFailureCode(stage));
            }
            await sleep(250);
        }
    }
    throw new MacOSPluginIdentityError(`Mac 插件 ${stage} 验证失败`, commandFailureCode(stage));
}
async function readPlist(plistPath, run) {
    const stat = await fs.promises.lstat(plistPath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink() || stat.size <= 0 || stat.size > MAX_PLIST_BYTES) {
        throw new MacOSPluginIdentityError('Mac 插件 Info.plist 缺失或大小无效');
    }
    const result = await runChecked(run, 'Info.plist', '/usr/bin/plutil', ['-convert', 'json', '-o', '-', plistPath]);
    try {
        const value = JSON.parse(result.stdout);
        if (!value || typeof value !== 'object' || Array.isArray(value))
            throw new Error('not a dictionary');
        return value;
    }
    catch {
        throw new MacOSPluginIdentityError('Mac 插件 Info.plist 不是有效字典');
    }
}
function requiredPlistString(plist, key) {
    const value = plist[key];
    if (typeof value !== 'string' || !value || value.length > 256) {
        throw new MacOSPluginIdentityError(`Mac 插件 Info.plist 缺少 ${key}`);
    }
    return value;
}
function requiredExecutableName(plist, expected) {
    const value = requiredPlistString(plist, 'CFBundleExecutable');
    if (value !== expected || value !== path.basename(value)) {
        throw new MacOSPluginIdentityError('Mac 插件 CFBundleExecutable 不符合固定产品策略');
    }
    return value;
}
async function requireBundleDirectory(bundlePath, label) {
    const stat = await fs.promises.lstat(bundlePath).catch(() => null);
    if (!stat?.isDirectory() || stat.isSymbolicLink()) {
        throw new MacOSPluginIdentityError(`${label} 必须是固定位置的非 symlink App Bundle`);
    }
}
async function requireEmbeddedNotarizationTicket(bundlePath) {
    const ticketPath = path.join(bundlePath, 'Contents', 'CodeResources');
    const stat = await fs.promises.lstat(ticketPath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink()
        || stat.size < 4 || stat.size > MAX_STAPLED_TICKET_BYTES) {
        throw new MacOSPluginIdentityError('Mac 插件缺少内嵌公证票据', 'MACOS_PLUGIN_NOTARIZATION_TICKET_FAILED');
    }
    const handle = await fs.promises.open(ticketPath, 'r');
    const magic = Buffer.allocUnsafe(4);
    try {
        const { bytesRead } = await handle.read(magic, 0, magic.length, 0);
        if (bytesRead !== magic.length || !magic.equals(Buffer.from('s8ch', 'ascii'))) {
            throw new MacOSPluginIdentityError('Mac 插件内嵌公证票据格式无效', 'MACOS_PLUGIN_NOTARIZATION_TICKET_FAILED');
        }
    }
    finally {
        await handle.close();
    }
}
export function hasUnixExecutableMode(stat) {
    return (stat.mode & 0o111) !== 0;
}
async function requireExecutable(executablePath, label, executableModeProbe) {
    const stat = await fs.promises.lstat(executablePath).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink()) {
        throw new MacOSPluginIdentityError(`${label} 主程序缺失、不可执行或是 symlink`);
    }
    const executable = await executableModeProbe(executablePath, stat);
    if (!executable) {
        throw new MacOSPluginIdentityError(`${label} 主程序缺失、不可执行或是 symlink`);
    }
}
function assertSigningDetails(details, identifier) {
    const lines = details.split(/\r?\n/).map((line) => line.trim());
    const hasHardenedRuntime = lines.some((line) => {
        if (!line.startsWith('CodeDirectory '))
            return false;
        const match = line.match(/(?:^|\s)flags=0x[0-9a-f]+\(([^)]*)\)(?:\s|$)/i);
        if (!match)
            return false;
        return match[1].split(',').map((flag) => flag.trim()).includes('runtime');
    });
    if (!lines.includes(`Identifier=${identifier}`)
        || !lines.includes(`TeamIdentifier=${RPA_MACOS_TEAM_ID}`)
        || !lines.some((line) => line.startsWith('Authority=Developer ID Application:'))
        || !hasHardenedRuntime) {
        throw new MacOSPluginIdentityError('Mac 插件 Developer ID、Team 或 hardened runtime 不匹配');
    }
}
async function collectMachOFiles(bundlePath) {
    const pending = [bundlePath];
    const machoFiles = [];
    let fileCount = 0;
    while (pending.length > 0) {
        const current = pending.pop();
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
            const candidate = path.join(current, entry.name);
            const stat = await fs.promises.lstat(candidate);
            if (stat.isSymbolicLink())
                continue;
            if (stat.isDirectory()) {
                pending.push(candidate);
                continue;
            }
            if (!stat.isFile())
                throw new MacOSPluginIdentityError('Mac 插件包含不支持的原生文件类型');
            fileCount += 1;
            if (fileCount > MAX_BUNDLE_FILES)
                throw new MacOSPluginIdentityError('Mac 插件文件数量超过身份验证限制');
            if (stat.size < 4)
                continue;
            const handle = await fs.promises.open(candidate, 'r');
            const magic = Buffer.allocUnsafe(4);
            try {
                await handle.read(magic, 0, 4, 0);
            }
            finally {
                await handle.close();
            }
            if (MACHO_MAGICS.has(magic.toString('hex'))) {
                machoFiles.push(candidate);
                if (machoFiles.length > MAX_MACHO_FILES) {
                    throw new MacOSPluginIdentityError('Mac 插件 Mach-O 数量超过身份验证限制');
                }
            }
        }
    }
    return machoFiles;
}
/** Verify an extracted Control.app without modifying or re-signing user content. */
export async function verifyMacOSPluginIdentity(bundlePath, manifest, dependencies = {}) {
    if ((dependencies.platform ?? process.platform) !== 'darwin') {
        throw new MacOSPluginIdentityError('Mac 插件身份验证只能在 Darwin 执行');
    }
    if (!path.isAbsolute(bundlePath) || path.basename(bundlePath) !== RPA_MACOS_BUNDLE_NAME) {
        throw new MacOSPluginIdentityError('Mac 插件路径与签名清单入口不匹配');
    }
    if (manifest.platform !== 'darwin' || manifest.architecture !== 'arm64'
        || manifest.entrypoint !== RPA_MACOS_BUNDLE_NAME || !manifest.macos_identity) {
        throw new MacOSPluginIdentityError('Mac 插件 Manifest 目标或产品身份缺失');
    }
    if (dependencies.systemVersion
        && compareNumericVersions(dependencies.systemVersion, manifest.minimum_os_version) < 0) {
        throw new MacOSPluginIdentityError(`当前 macOS 低于插件要求的 ${manifest.minimum_os_version}`);
    }
    const identity = manifest.macos_identity;
    if (identity.control_bundle_identifier !== RPA_MACOS_CONTROL_BUNDLE_ID
        || identity.helper_bundle_identifier !== RPA_MACOS_HELPER_BUNDLE_ID
        || identity.team_identifier !== RPA_MACOS_TEAM_ID
        || identity.bundle_name !== RPA_MACOS_BUNDLE_NAME
        || identity.helper_relative_path !== RPA_MACOS_HELPER_RELATIVE_PATH
        || identity.build_channel !== 'production'
        || identity.capability_wave !== 'none') {
        throw new MacOSPluginIdentityError('Mac 插件 Manifest 身份不符合固定产品策略');
    }
    await requireBundleDirectory(bundlePath, 'Control');
    const helperPath = path.join(bundlePath, RPA_MACOS_HELPER_RELATIVE_PATH);
    await requireBundleDirectory(helperPath, 'Helper');
    await requireEmbeddedNotarizationTicket(bundlePath);
    const run = dependencies.execFile ?? defaultExecFile;
    const sleep = dependencies.sleep
        ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
    const controlPlist = await readPlist(path.join(bundlePath, 'Contents', 'Info.plist'), run);
    const helperPlist = await readPlist(path.join(helperPath, 'Contents', 'Info.plist'), run);
    const controlExecutable = path.join(bundlePath, 'Contents', 'MacOS', requiredExecutableName(controlPlist, 'YokoWebotRpaControl'));
    const helperExecutable = path.join(helperPath, 'Contents', 'MacOS', requiredExecutableName(helperPlist, 'YokoRpaDistributionHelper'));
    const executableModeProbe = dependencies.executableModeProbe
        ?? ((_filePath, stat) => hasUnixExecutableMode(stat));
    await requireExecutable(controlExecutable, 'Control', executableModeProbe);
    await requireExecutable(helperExecutable, 'Helper', executableModeProbe);
    const exactPairs = [
        [controlPlist.CFBundleIdentifier, RPA_MACOS_CONTROL_BUNDLE_ID],
        [helperPlist.CFBundleIdentifier, RPA_MACOS_HELPER_BUNDLE_ID],
        [controlPlist.CFBundleVersion, identity.control_bundle_version],
        [helperPlist.CFBundleVersion, identity.helper_bundle_version],
        [controlPlist.CFBundleShortVersionString, manifest.version],
        [controlPlist.YokoBuildChannel, identity.build_channel],
        [controlPlist.YokoCapabilityWave, identity.capability_wave],
        [controlPlist.YokoExpectedPeerIdentifier, RPA_MACOS_HELPER_BUNDLE_ID],
        [helperPlist.YokoExpectedPeerIdentifier, RPA_MACOS_CONTROL_BUNDLE_ID],
        [controlPlist.YokoExpectedTeamIdentifier, RPA_MACOS_TEAM_ID],
        [helperPlist.YokoExpectedTeamIdentifier, RPA_MACOS_TEAM_ID],
    ];
    if (exactPairs.some(([actual, expected]) => actual !== expected)) {
        throw new MacOSPluginIdentityError('Mac 插件 Bundle/版本/构建策略与签名清单不匹配');
    }
    await runChecked(run, 'codesign 完整性', '/usr/bin/codesign', ['--verify', '--deep', '--strict', '--verbose=2', bundlePath]);
    const controlSignature = await runChecked(run, 'Control 签名身份', '/usr/bin/codesign', ['-dv', '--verbose=4', bundlePath]);
    const helperSignature = await runChecked(run, 'Helper 签名身份', '/usr/bin/codesign', ['-dv', '--verbose=4', helperPath]);
    assertSigningDetails(`${controlSignature.stdout}\n${controlSignature.stderr}`, RPA_MACOS_CONTROL_BUNDLE_ID);
    assertSigningDetails(`${helperSignature.stdout}\n${helperSignature.stderr}`, RPA_MACOS_HELPER_BUNDLE_ID);
    const machoFiles = await collectMachOFiles(bundlePath);
    if (machoFiles.length === 0)
        throw new MacOSPluginIdentityError('Mac 插件不包含可验证的 Mach-O');
    for (const machoFile of machoFiles) {
        const result = await runChecked(run, 'Mach-O 架构', '/usr/bin/lipo', ['-archs', machoFile]);
        const architectures = result.stdout.trim().split(/\s+/).filter(Boolean);
        if (architectures.length !== 1 || architectures[0] !== 'arm64') {
            throw new MacOSPluginIdentityError('Mac 插件包含非 arm64 或 universal Mach-O');
        }
    }
    const gatekeeper = await runChecked(run, 'Gatekeeper', '/usr/sbin/spctl', ['--assess', '--type', 'execute', '--verbose=4', bundlePath]);
    const gatekeeperDetails = `${gatekeeper.stdout}\n${gatekeeper.stderr}`;
    if (!/(?:^|\n)source=Notarized Developer ID(?:\n|$)/.test(gatekeeperDetails)) {
        throw new MacOSPluginIdentityError('Mac 插件 Gatekeeper 未确认为 Notarized Developer ID', 'MACOS_PLUGIN_GATEKEEPER_FAILED');
    }
    // stapler may transiently return EX_NOHOST (68) while resolving Apple's
    // ticket service even when the embedded ticket is valid. Every attempt still
    // performs the complete validation; a missing or invalid ticket stays closed.
    try {
        await runCheckedWithRetries(run, sleep, 3, '公证票据', '/usr/bin/xcrun', ['stapler', 'validate', bundlePath]);
    }
    catch (error) {
        // stapler validates through Apple's CloudKit endpoint and can fail behind
        // a required TLS proxy even for a valid stapled product. Installation may
        // continue only after the immutable signed artifact, embedded ticket and
        // Gatekeeper's exact notarized source have all passed above.
        if (!(error instanceof MacOSPluginIdentityError)
            || error.code !== 'MACOS_PLUGIN_NOTARIZATION_TICKET_FAILED') {
            throw error;
        }
    }
    return {
        controlBundleIdentifier: RPA_MACOS_CONTROL_BUNDLE_ID,
        helperBundleIdentifier: RPA_MACOS_HELPER_BUNDLE_ID,
        teamIdentifier: RPA_MACOS_TEAM_ID,
        version: manifest.version,
        controlBundleVersion: identity.control_bundle_version,
        helperBundleVersion: identity.helper_bundle_version,
        architecture: 'arm64',
        machoFileCount: machoFiles.length,
        hardenedRuntime: true,
        gatekeeperAccepted: true,
        notarizationStapled: true,
    };
}
