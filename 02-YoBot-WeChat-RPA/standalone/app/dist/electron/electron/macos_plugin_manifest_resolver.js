import { verifySignedPluginManifestV2, } from './plugin_manifest.js';
const MAX_CLOCK_SKEW_MS = 10 * 60 * 1000;
export class MacOSInstalledManifestError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'MacOSInstalledManifestError';
        this.code = code;
    }
    toJSON() {
        return { name: this.name, code: this.code, message: this.message };
    }
}
function resolverError(code, message) {
    return new MacOSInstalledManifestError(code, message);
}
function manifestMatchesMarker(verified, installed) {
    const manifest = verified.payload;
    return manifest.plugin_name === installed.plugin_name
        && manifest.channel_id === installed.channel_id
        && manifest.platform === installed.platform
        && manifest.architecture === installed.architecture
        && manifest.version === installed.version
        && manifest.version_code === installed.version_code
        && manifest.artifact_sha256 === installed.artifact_sha256
        && manifest.artifact_size_bytes === installed.artifact_size_bytes
        && manifest.entrypoint === installed.entrypoint;
}
function numericVersion(value) {
    if (!/^\d+(?:\.\d+){1,3}$/.test(value))
        return null;
    return value.split('.').map(Number);
}
function compareNumericVersions(left, right) {
    const a = numericVersion(left);
    const b = numericVersion(right);
    if (!a || !b) {
        throw resolverError('MACOS_INSTALLED_MANIFEST_STATE_INVALID', 'macOS 插件系统版本策略无效');
    }
    for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
        const difference = (a[index] ?? 0) - (b[index] ?? 0);
        if (difference !== 0)
            return difference > 0 ? 1 : -1;
    }
    return 0;
}
/**
 * Re-verifies the signed release record stored atomically beside an immutable
 * plugin version. Expiry is evaluated at commit time: it proves the artifact
 * was authorized when installed, while current key trust still provides an
 * explicit way to revoke a historical release or signing key.
 */
export class MacOSInstalledManifestResolver {
    store;
    trustedKeys;
    agentVersionCode;
    runtimeContractVersion;
    minimumOsVersion;
    now;
    constructor(options) {
        if ((options.platform ?? process.platform) !== 'darwin') {
            throw resolverError('MACOS_INSTALLED_MANIFEST_STATE_INVALID', 'macOS 已安装清单解析器只能在 Darwin 使用');
        }
        if (!Number.isSafeInteger(options.agentVersionCode) || options.agentVersionCode <= 0
            || !/^\d+\.\d+$/.test(options.runtimeContractVersion ?? '1.0')
            || !numericVersion(options.minimumOsVersion ?? '13.0')) {
            throw resolverError('MACOS_INSTALLED_MANIFEST_STATE_INVALID', 'macOS 已安装清单解析策略无效');
        }
        this.store = options.store;
        this.trustedKeys = options.trustedKeys;
        this.agentVersionCode = options.agentVersionCode;
        this.runtimeContractVersion = options.runtimeContractVersion ?? '1.0';
        this.minimumOsVersion = options.minimumOsVersion ?? '13.0';
        this.now = options.now ?? Date.now;
    }
    async resolve(installed) {
        if (installed.plugin_name !== 'wechat-rpa' || installed.channel_id !== 'agent_generic'
            || installed.platform !== 'darwin' || installed.architecture !== 'arm64'
            || installed.entrypoint !== 'YokoWebot RPA Control.app') {
            throw resolverError('MACOS_INSTALLED_MANIFEST_MARKER_MISMATCH', '不可变插件 marker 不属于官方 macOS RPA 目标');
        }
        const committedAt = Date.parse(installed.committed_at);
        const now = this.now();
        if (!Number.isFinite(committedAt) || !Number.isFinite(now)
            || committedAt > now + MAX_CLOCK_SKEW_MS) {
            throw resolverError('MACOS_INSTALLED_MANIFEST_STATE_INVALID', '不可变插件 marker 的提交时间无效');
        }
        let envelope;
        try {
            envelope = await this.store.readInstalledManifestEnvelope(installed.version);
        }
        catch {
            throw resolverError('MACOS_INSTALLED_MANIFEST_STATE_INVALID', '无法读取不可变插件版本的签名清单');
        }
        if (!envelope) {
            throw resolverError('MACOS_INSTALLED_MANIFEST_MISSING', '不可变插件版本缺少签名发布清单');
        }
        let verified;
        try {
            verified = verifySignedPluginManifestV2(envelope, this.trustedKeys, {
                pluginName: installed.plugin_name,
                channelId: installed.channel_id,
                platform: 'darwin',
                architecture: 'arm64',
                version: installed.version,
                versionCode: installed.version_code,
                runtimeContractVersion: this.runtimeContractVersion,
                minimumOsVersion: this.minimumOsVersion,
                agentVersionCode: this.agentVersionCode,
                now: committedAt,
            });
        }
        catch (error) {
            if (error instanceof Error && error.message === '当前 Agent 版本低于插件发布清单要求') {
                throw resolverError('MACOS_INSTALLED_MANIFEST_INCOMPATIBLE', '已安装插件要求更高版本的 Agent');
            }
            throw resolverError('MACOS_INSTALLED_MANIFEST_SIGNATURE_INVALID', '已安装插件的签名发布清单未通过当前 trust root 复核');
        }
        if (!manifestMatchesMarker(verified, installed)) {
            throw resolverError('MACOS_INSTALLED_MANIFEST_MARKER_MISMATCH', '已安装插件的签名发布清单与 immutable marker 不匹配');
        }
        if (compareNumericVersions(this.minimumOsVersion, verified.payload.minimum_os_version) < 0
            || verified.payload.minimum_agent_version_code > this.agentVersionCode) {
            throw resolverError('MACOS_INSTALLED_MANIFEST_INCOMPATIBLE', '已安装插件与当前 Agent 或 macOS 发布策略不兼容');
        }
        return verified;
    }
}
