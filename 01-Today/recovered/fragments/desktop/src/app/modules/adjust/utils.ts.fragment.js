// Compiled fragment from ./src/app/modules/adjust/utils.ts.
// The original TypeScript and import graph are not restored.




const deriveIdentifier = (namespace, value, label)=>{
    const normalized = value.trim();
    if (!normalized) {
        throw new TypeError(`The ${label} is missing.`);
    }
    return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(`${namespace}${normalized}`).digest('hex');
};
const deriveDesktopAdjustDeviceId = (installationId)=>{
    return deriveIdentifier(ADJUST_DEVICE_ID_NAMESPACE, installationId, 'CPI installation ID');
};
const deriveDesktopAdjustAccountId = (accountId)=>{
    return deriveIdentifier(ADJUST_ACCOUNT_ID_NAMESPACE, accountId, 'account ID');
};
const resolveDesktopAdjustPlatform = (platform)=>{
    if (platform === cpi_SystemPlatform.MacOS) {
        return 'macos';
    }
    if (platform === cpi_SystemPlatform.Windows) {
        return 'windows';
    }
    return undefined;
};
const toDesktopAdjustOccurredAt = (occurredAtMs)=>{
    const date = new Date(occurredAtMs);
    if (!Number.isFinite(occurredAtMs) || Number.isNaN(date.getTime())) {
        throw new TypeError('The Adjust occurrence time is invalid.');
    }
    return date.toISOString();
};
const getDesktopAdjustRetryDelay = (attempt, jitterKey)=>{
    if (!Number.isSafeInteger(attempt) || attempt < 1) {
        throw new TypeError('The Adjust retry attempt is invalid.');
    }
    const exponent = Math.min(attempt - 1, 16);
    const baseDelay = Math.min((/* inlined export .ADJUST_RETRY_INITIAL_DELAY_MS */60000) * 2 ** exponent, ADJUST_RETRY_MAX_DELAY_MS);
    if (!jitterKey) {
        return baseDelay;
    }
    const jitterValue = (0,external_node_crypto_namespaceObject.createHash)('sha256').update(jitterKey).digest().readUInt32BE(0);
    const jitterFactor = 0.75 + jitterValue / 0xffffffff * 0.25;
    return Math.round(baseDelay * jitterFactor);
};
const parseDesktopAdjustRetryAfter = (value, nowMs)=>{
    if (!value) {
        return undefined;
    }
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.ceil(seconds * 1000), ADJUST_RETRY_MAX_DELAY_MS);
    }
    const dateMs = Date.parse(value);
    if (Number.isNaN(dateMs)) {
        return undefined;
    }
    return Math.min(Math.max(0, dateMs - nowMs), ADJUST_RETRY_MAX_DELAY_MS);
};
const adjust_utils_isRecord = (value)=>{
    return typeof value === 'object' && value !== null && !Array.isArray(value);
};
const isDesktopAdjustAcceptedResponse = (responseText)=>{
    try {
        const value = JSON.parse(responseText);
        return adjust_utils_isRecord(value) && value['success'] === true && value['code'] === 'common.ok' && adjust_utils_isRecord(value['data']) && value['data']['accepted'] === true;
    } catch  {
        return false;
    }
};
