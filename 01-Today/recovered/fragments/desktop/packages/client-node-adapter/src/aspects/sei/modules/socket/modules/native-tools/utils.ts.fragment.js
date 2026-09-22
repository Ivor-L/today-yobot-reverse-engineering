// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/native-tools/utils.ts.
// The original TypeScript and import graph are not restored.

const native_tools_utils_isRecord = (value)=>typeof value === 'object' && value !== null && !Array.isArray(value);
const utils_isJsonValue = (value)=>{
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(utils_isJsonValue);
    }
    if (!native_tools_utils_isRecord(value)) {
        return false;
    }
    return Object.values(value).every(utils_isJsonValue);
};
const nonEmptyString = (value)=>{
    if (typeof value !== 'string') {
        return null;
    }
    const normalized = value.trim();
    return normalized || null;
};
const isNativeToolSocketMessage = (message)=>{
    switch(message['type']){
        case 'invocation.request':
        case 'invocation.cancel':
        case 'cloud.pending_invocations':
        case 'cloud.result_ack':
            return true;
        default:
            return false;
    }
};
const toNativeToolInvocationRequest = (message)=>{
    const invocationId = nonEmptyString(message['invocationId']);
    const capabilityId = nonEmptyString(message['capabilityId']);
    const argumentsValue = message['args'] ?? {};
    if (!invocationId || !capabilityId || !native_tools_utils_isRecord(argumentsValue) || !utils_isJsonValue(argumentsValue)) {
        return null;
    }
    const timeoutMs = message['timeoutMs'];
    if (timeoutMs !== undefined && (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs))) {
        return null;
    }
    return {
        arguments: structuredClone(argumentsValue),
        capabilityId,
        invocationId,
        ...typeof timeoutMs === 'number' ? {
            timeoutMs
        } : {}
    };
};
const toNativeToolInvocationCancellation = (message)=>{
    const invocationId = nonEmptyString(message['invocationId']);
    if (!invocationId) {
        return null;
    }
    const reason = message['reason'];
    if (reason !== undefined && typeof reason !== 'string') {
        return null;
    }
    return {
        invocationId,
        ...typeof reason === 'string' ? {
            reason
        } : {}
    };
};
const toNativeToolPendingInvocationResultsRequest = (message)=>{
    const values = message['invocations'];
    if (!Array.isArray(values)) {
        return null;
    }
    const invocations = values.map((value)=>{
        if (!native_tools_utils_isRecord(value)) {
            return null;
        }
        const invocationId = nonEmptyString(value['invocationId']);
        const capabilityId = nonEmptyString(value['capabilityId']);
        if (!invocationId || !capabilityId) {
            return null;
        }
        return {
            capabilityId,
            invocationId
        };
    });
    if (invocations.some((value)=>value === null)) {
        return null;
    }
    return {
        invocations: invocations.filter((value)=>value !== null)
    };
};
const toNativeToolInvocationResultAcknowledgement = (message)=>{
    const invocationId = nonEmptyString(message['invocationId']);
    if (!invocationId) {
        return null;
    }
    return {
        invocationId
    };
};
