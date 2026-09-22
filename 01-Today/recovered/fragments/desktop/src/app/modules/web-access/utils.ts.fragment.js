// Compiled fragment from ./src/app/modules/web-access/utils.ts.
// The original TypeScript and import graph are not restored.



const web_access_utils_isRecord = (value)=>typeof value === 'object' && value !== null && !Array.isArray(value);
const normalizeVercelBypassSecret = (value)=>{
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim();
    if (normalized.length === 0 || normalized.length > 4096) {
        return undefined;
    }
    return normalized;
};
const parsePersistedWebAccessState = (value, environment)=>{
    if (!web_access_utils_isRecord(value)) {
        return undefined;
    }
    const bypassSecret = normalizeVercelBypassSecret(value.bypassSecret);
    if (!bypassSecret || value.environment !== environment || value.schemaVersion !== (/* inlined export .WEB_ACCESS_STATE_SCHEMA_VERSION */1)) {
        return undefined;
    }
    return {
        bypassSecret,
        environment,
        schemaVersion: (/* inlined export .WEB_ACCESS_STATE_SCHEMA_VERSION */1)
    };
};
const isSupportedWebAccessEnvironment = (value)=>value === base_RuntimeEnvironment.Development || value === base_RuntimeEnvironment.Staging || value === base_RuntimeEnvironment.Production;
