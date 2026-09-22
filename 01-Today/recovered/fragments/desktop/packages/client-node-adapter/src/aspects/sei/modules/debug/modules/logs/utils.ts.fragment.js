// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/logs/utils.ts.
// The original TypeScript and import graph are not restored.



const LOG_LAYERS = new Set([
    'web',
    'node',
    'native'
]);
const LOG_LEVELS = new Set(Object.values(base_LogLevel));
const RUNTIME_PLATFORMS = new Set(Object.values(base_ClientRuntimePlatform));
const RUNTIME_ENVIRONMENTS = new Set(Object.values(base_RuntimeEnvironment));
const logs_utils_isRecord = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};
const readOptionalString = (value)=>typeof value === 'string' ? value : undefined;
const projectMetadataString = (value)=>{
    if (value.length <= (/* inlined export .MAX_DEBUG_LOG_METADATA_CHARS */2048)) {
        return {
            truncated: false,
            value
        };
    }
    return {
        truncated: true,
        value: `${value.slice(0, (/* inlined export .MAX_DEBUG_LOG_METADATA_CHARS */2048) - 1)}…`
    };
};
const copyJsonValue = (value, seen, budget, depth)=>{
    if (depth > (/* inlined export .MAX_DEBUG_LOG_DEPTH */16) || budget.remainingItems <= 0) {
        return undefined;
    }
    budget.remainingItems -= 1;
    if (value === null || typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        if (value.length > budget.remainingStringChars) {
            return undefined;
        }
        budget.remainingStringChars -= value.length;
        return value;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    if (Array.isArray(value)) {
        if (seen.has(value)) {
            return undefined;
        }
        seen.add(value);
        const copied = [];
        for (const item of value){
            const child = copyJsonValue(item, seen, budget, depth + 1);
            if (child === undefined) {
                return undefined;
            }
            copied.push(child);
        }
        seen.delete(value);
        return copied;
    }
    if (!logs_utils_isRecord(value)) {
        return undefined;
    }
    if (seen.has(value)) {
        return undefined;
    }
    seen.add(value);
    const copied = Object.create(null);
    for(const key in value){
        if (!Object.hasOwn(value, key)) {
            continue;
        }
        if (key.length > budget.remainingStringChars) {
            return undefined;
        }
        budget.remainingStringChars -= key.length;
        const child = copyJsonValue(value[key], seen, budget, depth + 1);
        if (child === undefined) {
            return undefined;
        }
        copied[key] = child;
    }
    seen.delete(value);
    return copied;
};
const copyJsonRecord = (value)=>{
    if (!logs_utils_isRecord(value)) {
        return undefined;
    }
    const copied = copyJsonValue(value, new WeakSet(), {
        remainingItems: (/* inlined export .MAX_DEBUG_LOG_ITEMS */2000),
        remainingStringChars: (/* inlined export .MAX_DEBUG_LOG_STRING_CHARS */262144)
    }, 0);
    return logs_utils_isRecord(copied) ? copied : undefined;
};
const toDebugLogRecord = (target, value)=>{
    if (!logs_utils_isRecord(value)) {
        return undefined;
    }
    const { app_version: appVersion, device_id: deviceId, id, layer, level, payload, platform, runtime_environment: runtimeEnvironment, time: recordedAt, user_id: userId } = value;
    if (typeof appVersion !== 'string' || typeof id !== 'string' || typeof layer !== 'string' || !LOG_LAYERS.has(layer) || typeof level !== 'string' || !LOG_LEVELS.has(level) || typeof platform !== 'string' || !RUNTIME_PLATFORMS.has(platform) || typeof recordedAt !== 'number' || !Number.isFinite(recordedAt) || typeof runtimeEnvironment !== 'string' || !RUNTIME_ENVIRONMENTS.has(runtimeEnvironment)) {
        return undefined;
    }
    const appVersionProjection = projectMetadataString(appVersion);
    const idProjection = projectMetadataString(id);
    const normalizedDeviceId = readOptionalString(deviceId);
    const normalizedUserId = readOptionalString(userId);
    const deviceIdProjection = normalizedDeviceId === undefined ? undefined : projectMetadataString(normalizedDeviceId);
    const userIdProjection = normalizedUserId === undefined ? undefined : projectMetadataString(normalizedUserId);
    const normalizedPayload = payload === undefined ? undefined : copyJsonRecord(payload);
    const metadataTruncated = appVersionProjection.truncated || idProjection.truncated || deviceIdProjection?.truncated === true || userIdProjection?.truncated === true;
    const payloadTruncated = payload !== undefined && normalizedPayload === undefined;
    return Object.freeze({
        appVersion: appVersionProjection.value,
        ...deviceIdProjection === undefined ? {} : {
            deviceId: deviceIdProjection.value
        },
        id: idProjection.value,
        layer: layer,
        level: level,
        ...metadataTruncated ? {
            metadataTruncated: true
        } : {},
        ...normalizedPayload === undefined ? {} : {
            payload: normalizedPayload
        },
        ...payloadTruncated ? {
            payloadTruncated: true
        } : {},
        platform: platform,
        recordedAt,
        runtimeEnvironment: runtimeEnvironment,
        target,
        ...userIdProjection === undefined ? {} : {
            userId: userIdProjection.value
        }
    });
};
const parseDebugLogRecord = (target, serialized)=>{
    try {
        return toDebugLogRecord(target, JSON.parse(serialized));
    } catch  {
        return undefined;
    }
};
