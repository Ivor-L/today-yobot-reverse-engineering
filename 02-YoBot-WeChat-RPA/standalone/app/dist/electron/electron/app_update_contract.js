import * as crypto from 'node:crypto';
export function resolveAppUpdateTarget(platform = process.platform, architecture = process.arch) {
    if (platform === 'win32' && architecture === 'x64') {
        return { platform: 'win32', architecture: 'x64', artifactType: 'nsis' };
    }
    if (platform === 'darwin' && architecture === 'arm64') {
        return { platform: 'darwin', architecture: 'arm64', artifactType: 'zip' };
    }
    return null;
}
/**
 * The common manager is active only when a packaged app has an install driver
 * for its exact platform target. This keeps Darwin hard-off until the Mac
 * composition explicitly supplies a verified ZIP/Squirrel driver, without
 * baking a Windows-only branch into shared policy and pending-state logic.
 */
export function isAppUpdateRuntimeConfigured(isPackaged, target, driverTarget) {
    return isPackaged
        && target !== null
        && driverTarget !== null
        && driverTarget.platform === target.platform
        && driverTarget.architecture === target.architecture
        && driverTarget.artifactType === target.artifactType;
}
/**
 * Windows remains on the frozen legacy route. A Darwin client may request the
 * additive target-aware API only after its install driver has been composed.
 */
export function appUpdatePolicyTargetQuery(target) {
    if (target.platform !== 'darwin')
        return Object.freeze({});
    return Object.freeze({
        manifest_version: '2',
        platform: target.platform,
        architecture: target.architecture,
    });
}
const DEFAULT_POLICY = {
    enabled: false,
    auto_download: false,
    force_update: false,
    force_after: null,
    min_supported_version_code: 0,
    min_rpa_version_code: 0,
    rpa_action: 'allow',
    rollout_percentage: 100,
    install_mode: 'next_launch',
    support_url: null,
    update_available: false,
    rollout_eligible: false,
    enforcement_active: false,
    force_update_required: false,
    client_supported: true,
    rpa_blocked: false,
};
function integer(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : fallback;
}
export function versionToCode(version) {
    const parts = String(version || '')
        .replace(/^v/i, '')
        .split(/[.+-]/, 4)
        .map((part) => integer(part, 0));
    return (parts[0] || 0) * 1_000_000
        + (parts[1] || 0) * 10_000
        + (parts[2] || 0) * 100
        + (parts[3] || 0);
}
const ELECTRON_BUILDER_NS_UUID = '50e065bc-3134-11e6-9bab-38c9862bdaf3';
export function electronBuilderNsisGuid(appId) {
    const namespace = Buffer.from(ELECTRON_BUILDER_NS_UUID.replace(/-/g, ''), 'hex');
    const digest = crypto.createHash('sha1')
        .update(namespace)
        .update(Buffer.from(appId, 'utf8'))
        .digest();
    digest[6] = (digest[6] & 0x0f) | 0x50;
    digest[8] = (digest[8] & 0x3f) | 0x80;
    const hex = digest.subarray(0, 16).toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function normalizeClientPolicy(raw) {
    const action = raw?.rpa_action;
    const installMode = raw?.install_mode;
    return {
        ...DEFAULT_POLICY,
        enabled: raw?.enabled === true,
        auto_download: raw?.auto_download === true,
        force_update: raw?.force_update === true,
        force_after: typeof raw?.force_after === 'string' && raw.force_after ? raw.force_after : null,
        min_supported_version_code: integer(raw?.min_supported_version_code),
        min_rpa_version_code: integer(raw?.min_rpa_version_code),
        rpa_action: action === 'block_start' || action === 'stop_now' ? action : 'allow',
        rollout_percentage: Math.min(100, integer(raw?.rollout_percentage, 100)),
        install_mode: installMode === 'manual' ? 'manual' : 'next_launch',
        support_url: typeof raw?.support_url === 'string' && raw.support_url ? raw.support_url : null,
        update_available: raw?.update_available === true,
        rollout_eligible: raw?.rollout_eligible === true,
        enforcement_active: raw?.enforcement_active === true,
        force_update_required: raw?.force_update_required === true,
        client_supported: raw?.client_supported !== false,
        rpa_blocked: raw?.rpa_blocked === true,
    };
}
export function shouldOfferUpdate(policy) {
    return policy.enabled && policy.update_available
        && (policy.rollout_eligible || policy.force_update_required || policy.rpa_blocked);
}
export function shouldAutoDownload(policy) {
    return shouldOfferUpdate(policy)
        && (policy.auto_download || policy.force_update_required || policy.rpa_blocked);
}
export function shouldBlockRpa(policy) {
    return policy.enabled && policy.rpa_blocked && policy.rpa_action !== 'allow';
}
export function reconcilePolicyForCurrentVersion(policy, currentVersionCode, targetVersionCode) {
    const updateAvailable = targetVersionCode > currentVersionCode;
    const clientSupported = policy.min_supported_version_code <= 0
        || currentVersionCode >= policy.min_supported_version_code;
    return {
        ...policy,
        update_available: updateAvailable,
        client_supported: clientSupported,
        force_update_required: policy.enabled
            && policy.enforcement_active
            && updateAvailable
            && (policy.force_update || !clientSupported),
        rpa_blocked: policy.enabled
            && policy.enforcement_active
            && policy.rpa_action !== 'allow'
            && policy.min_rpa_version_code > 0
            && currentVersionCode < policy.min_rpa_version_code,
    };
}
/** Keep the snapshot target fields internally consistent after policy refresh. */
export function resolveAppUpdateSnapshotTarget(policy, releaseVersion, releaseVersionCode) {
    if (!policy.update_available) {
        return { targetVersion: null, targetVersionCode: 0 };
    }
    return {
        targetVersion: releaseVersion,
        targetVersionCode: integer(releaseVersionCode),
    };
}
export function createInitialSnapshot(channelId, currentVersion) {
    return {
        phase: 'idle',
        channelId,
        currentVersion,
        currentVersionCode: versionToCode(currentVersion),
        targetVersion: null,
        targetVersionCode: 0,
        title: '',
        content: '',
        progress: 0,
        transferred: 0,
        total: 0,
        bytesPerSecond: 0,
        policy: { ...DEFAULT_POLICY },
        error: null,
        downloadedFile: null,
        installAttempts: 0,
        requiresElevation: false,
        manualFallbackUrl: null,
        updatedAt: new Date(0).toISOString(),
    };
}
