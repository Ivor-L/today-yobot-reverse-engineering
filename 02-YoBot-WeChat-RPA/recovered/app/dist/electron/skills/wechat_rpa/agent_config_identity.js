import { createHash } from 'node:crypto';
export function fireflowPublicId(value) {
    const normalized = String(value || '').trim();
    if (/^fireflow-[a-f0-9]{24}$/i.test(normalized))
        return normalized;
    return `fireflow-${createHash('sha256').update(normalized).digest('hex').slice(0, 24)}`;
}
export function usesMacKeychainAgentConfig(platform) {
    return platform === 'darwin';
}
/** Preserve the Windows timestamp identity; only Mac uses the Keychain public ID. */
export function fireflowEntryId(value, platform, now = Date.now()) {
    return usesMacKeychainAgentConfig(platform)
        ? fireflowPublicId(value)
        : `fireflow-${now}`;
}
function unwrap(value) {
    return value && typeof value === 'object' && value.success === true && 'data' in value
        ? value.data
        : value;
}
/** Resolve the public entry returned by the Mac Keychain-backed config API. */
export function persistedAgentEntry(response, submitted, runtimePlatform) {
    if (!usesMacKeychainAgentConfig(runtimePlatform))
        return submitted;
    const data = unwrap(response);
    const list = Array.isArray(data) ? data : (Array.isArray(data?.agents) ? data.agents : []);
    if (!list.length)
        return submitted;
    const provider = String(submitted?.platform || '').toLowerCase();
    const submittedId = String(submitted?.botId || submitted?.id || '');
    const expectedId = provider === 'fireflow' ? fireflowPublicId(submittedId) : submittedId;
    return list.find((item) => String(item?.platform || '').toLowerCase() === provider
        && (String(item?.botId || '') === expectedId || String(item?.id || '') === expectedId))
        || submitted;
}
