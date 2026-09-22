import * as path from 'node:path';
import { versionToCode } from './app_update_contract.js';
import { MacOSControlDriver } from './macos_control_driver.js';
import { MacOSControlHealthGate } from './macos_control_health.js';
import { MacOSPluginInstallerCoordinator } from './macos_plugin_installer.js';
import { MacOSPluginIntentGateway } from './macos_plugin_intent.js';
import { MacOSPluginLifecycleCoordinator } from './macos_plugin_lifecycle.js';
import { MacOSInstalledManifestResolver } from './macos_plugin_manifest_resolver.js';
import { MacOSPluginReleaseClient } from './macos_plugin_release_client.js';
import { MacOSPluginService, } from './macos_plugin_service.js';
import { MacOSPluginVersionStore } from './macos_plugin_store.js';
import { parseTrustedPluginManifestKeys } from './plugin_manifest.js';
export const MACOS_PLUGIN_CHANNEL_ID = 'agent_generic';
export const MACOS_PLUGIN_ARCHITECTURE = 'arm64';
export const MACOS_PLUGIN_RUNTIME_CONTRACT_VERSION = '1.0';
export const MACOS_PLUGIN_MINIMUM_OS_VERSION = '13.0';
export const MACOS_PLUGIN_CONTROL_PORT = 9922;
export const MACOS_PLUGIN_MANIFEST_KEYS_ENV = 'RPA_PLUGIN_MANIFEST_ED25519_PUBLIC_KEYS';
export const MACOS_PLUGIN_RELEASE_API_ENV = 'RPA_PLUGIN_RELEASE_API_BASE_URL';
function unavailable(reason, message) {
    return Object.freeze({ available: false, reason, message });
}
function numericVersion(value) {
    if (!/^\d+(?:\.\d+){1,3}$/.test(value))
        return null;
    const parts = value.split('.').map(Number);
    return parts.every((part) => Number.isSafeInteger(part)) ? parts : null;
}
function compareVersions(left, right) {
    for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
        const difference = (left[index] ?? 0) - (right[index] ?? 0);
        if (difference !== 0)
            return difference > 0 ? 1 : -1;
    }
    return 0;
}
/**
 * Pure composition step: construction does not touch disk, network, Control or
 * lifecycle recovery. Callers must explicitly invoke a service operation later.
 */
export function createMacOSPluginComposition(options) {
    const platform = options.platform ?? process.platform;
    if (platform !== 'darwin') {
        return unavailable('not-darwin', 'macOS RPA 服务仅在 Darwin 可用');
    }
    if ((options.architecture ?? process.arch) !== MACOS_PLUGIN_ARCHITECTURE) {
        return unavailable('unsupported-architecture', 'macOS RPA MVP 仅支持 Apple Silicon arm64');
    }
    if ((options.channelId ?? MACOS_PLUGIN_CHANNEL_ID) !== MACOS_PLUGIN_CHANNEL_ID) {
        return unavailable('unsupported-channel', 'macOS RPA MVP 仅支持官方 agent_generic 渠道');
    }
    const systemVersion = numericVersion(options.systemVersion);
    const minimumSystemVersion = numericVersion(MACOS_PLUGIN_MINIMUM_OS_VERSION);
    if (!systemVersion || compareVersions(systemVersion, minimumSystemVersion) < 0) {
        return unavailable('unsupported-os', 'macOS RPA MVP 要求 macOS 13.0 或更高版本');
    }
    if (!/^\d+\.\d+\.\d+(?:[.+-][A-Za-z0-9.-]+)?$/.test(options.agentVersion)) {
        return unavailable('agent-version-invalid', 'Agent 版本无法用于插件兼容性校验');
    }
    const agentVersionCode = versionToCode(options.agentVersion);
    if (!Number.isSafeInteger(agentVersionCode) || agentVersionCode <= 0) {
        return unavailable('agent-version-invalid', 'Agent 版本无法用于插件兼容性校验');
    }
    const releaseApiBaseUrl = options.releaseApiBaseUrl?.trim();
    if (!releaseApiBaseUrl) {
        return unavailable('release-api-missing', `未配置 ${MACOS_PLUGIN_RELEASE_API_ENV}，macOS RPA 保持不可用`);
    }
    const businessApiBaseUrl = options.businessApiBaseUrl?.trim();
    if (!businessApiBaseUrl) {
        return unavailable('business-api-missing', '未配置 macOS RPA 业务服务地址，macOS RPA 保持不可用');
    }
    if (typeof options.machineCodeProvider !== 'function') {
        return unavailable('device-identity-provider-missing', '稳定设备身份提供器不可用，macOS RPA 保持不可用');
    }
    if (!options.privateAgentToken?.trim()) {
        return unavailable('private-agent-token-missing', '本机私域 Agent 临时凭据不可用，macOS RPA 保持不可用');
    }
    const rawKeys = options.pluginManifestPublicKeys?.trim();
    if (!rawKeys) {
        return unavailable('manifest-trust-root-missing', `未配置独立的 ${MACOS_PLUGIN_MANIFEST_KEYS_ENV}，macOS RPA 保持不可用`);
    }
    let trustedKeys;
    try {
        trustedKeys = parseTrustedPluginManifestKeys(rawKeys);
    }
    catch {
        return unavailable('manifest-trust-root-invalid', 'macOS RPA Manifest trust root 无效');
    }
    if (trustedKeys.size < 2) {
        return unavailable('manifest-trust-root-invalid', 'macOS RPA 正式信任根至少需要发布钥和离线恢复钥');
    }
    try {
        if (options.fileLayout.platform !== 'darwin'
            || !path.isAbsolute(options.fileLayout.pluginsDir)
            || !path.isAbsolute(options.fileLayout.downloadsDir)
            || !path.isAbsolute(options.fileLayout.pluginStagingDir)) {
            throw new Error('invalid file layout');
        }
        const localTest = options.mode === 'local-test';
        const store = new MacOSPluginVersionStore({
            pluginsDir: options.fileLayout.pluginsDir,
            platform,
        });
        const releaseClient = new MacOSPluginReleaseClient({
            apiBaseUrl: releaseApiBaseUrl,
            trustedKeys,
            agentVersionCode,
            fetchFn: options.fetchFn,
            minimumOsVersion: MACOS_PLUGIN_MINIMUM_OS_VERSION,
            runtimeContractVersion: MACOS_PLUGIN_RUNTIME_CONTRACT_VERSION,
            allowLoopbackHttp: localTest,
            platform,
        });
        const installer = new MacOSPluginInstallerCoordinator({
            store,
            downloadsDir: options.fileLayout.downloadsDir,
            stagingDir: options.fileLayout.pluginStagingDir,
            fetchFn: options.fetchFn,
            platform,
        });
        const resolver = new MacOSInstalledManifestResolver({
            store,
            trustedKeys,
            agentVersionCode,
            runtimeContractVersion: MACOS_PLUGIN_RUNTIME_CONTRACT_VERSION,
            minimumOsVersion: MACOS_PLUGIN_MINIMUM_OS_VERSION,
            platform,
        });
        const control = options.controlDriver ?? new MacOSControlDriver({
            pluginRoot: path.join(options.fileLayout.pluginsDir, 'wechat-rpa'),
            secretStore: options.secretStore,
            platform,
        });
        const health = new MacOSControlHealthGate({
            fetcher: options.fetchFn,
            livenessProbe: (ownership) => control.isOwnedControlRunning(ownership),
            platform,
        });
        const lifecycle = new MacOSPluginLifecycleCoordinator({
            store,
            control,
            health,
            resolveVerifiedManifest: (installed) => resolver.resolve(installed),
            port: MACOS_PLUGIN_CONTROL_PORT,
            platform,
        });
        const service = new MacOSPluginService({
            releaseClient,
            installer,
            lifecycle,
            store,
            getGate: options.getGate,
            platform,
        });
        const intents = new MacOSPluginIntentGateway({
            service,
            authTokens: options.authTokens,
            businessApiBaseUrl,
            machineCodeProvider: options.machineCodeProvider,
            privateAgentToken: options.privateAgentToken,
            platform,
        });
        return Object.freeze({ available: true, service, intents });
    }
    catch {
        return unavailable('configuration-invalid', 'macOS RPA 主进程组合配置无效，服务保持不可用');
    }
}
/** One owner per Electron main process prevents divergent service graphs. */
export class MacOSPluginCompositionOwner {
    result = null;
    getOrCreate(options) {
        if (!this.result)
            this.result = createMacOSPluginComposition(options);
        return this.result;
    }
}
