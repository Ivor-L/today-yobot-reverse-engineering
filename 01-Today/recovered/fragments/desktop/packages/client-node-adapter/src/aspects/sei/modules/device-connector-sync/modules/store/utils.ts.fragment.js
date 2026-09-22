// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.

const isOptionalNumber = (value)=>{
    return value === undefined || typeof value === 'number' && Number.isFinite(value);
};
const utils_isOptionalString = (value)=>{
    return value === undefined || typeof value === 'string';
};
const isCapabilityState = (value)=>{
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const record = value;
    return isOptionalNumber(record.lastSuccessAtMs) && isOptionalNumber(record.lastReadAtMs) && utils_isOptionalString(record.lastFingerprint) && utils_isOptionalString(record.lastWindowFingerprint) && isOptionalNumber(record.cooldownUntilMs);
};
const isPendingUpload = (value)=>{
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const record = value;
    return typeof record.createdAtMs === 'number' && typeof record.capturedAtMs === 'number' && typeof record.fingerprint === 'string' && typeof record.windowFingerprint === 'string' && typeof record.attempts === 'number' && isOptionalNumber(record.nextAttemptAtMs);
};
