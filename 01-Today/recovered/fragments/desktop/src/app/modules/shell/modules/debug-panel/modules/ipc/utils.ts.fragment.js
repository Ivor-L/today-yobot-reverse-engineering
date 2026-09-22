// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/ipc/utils.ts.
// The original TypeScript and import graph are not restored.



// Lodash also accepts boxed strings and booleans; IPC values must remain primitives.
const utils_isPrimitiveString = (value)=>lodash_es_isString(value) && !lodash_es_isObject(value);
const utils_isPrimitiveBoolean = (value)=>lodash_es_isBoolean(value) && !lodash_es_isObject(value);
const isFeatureOverrideEnvelope = (value)=>lodash_es_isObjectLike(value) && lodash_es_hasIn(value, 'featureId') && lodash_es_hasIn(value, 'value');
const parseDebugFeatureOverride = (value)=>{
    if (!isFeatureOverrideEnvelope(value) || !utils_isPrimitiveString(value.featureId)) {
        throw new Error('A feature identifier and value are required');
    }
    if (!utils_isPrimitiveBoolean(value.value)) {
        throw new Error('This feature does not expose a boolean debug control');
    }
    return {
        featureId: value.featureId,
        value: value.value
    };
};
const parseDebugNetworkInspectionEnabled = (value)=>{
    if (!utils_isPrimitiveBoolean(value)) {
        throw new Error('Node Network inspection state must be a boolean');
    }
    return value;
};
const parseDebugTrafficLane = (value)=>{
    if (!utils_isPrimitiveString(value)) {
        throw new Error('Traffic lane must be a string');
    }
    return value.trim() || null;
};
const toDesktopTarget = (platform)=>{
    if (platform === 'darwin') {
        return 'mac';
    }
    if (platform === 'win32') {
        return 'windows';
    }
    return 'linux';
};
const toAppEnvironment = (environment)=>{
    if (environment === base_RuntimeEnvironment.Development) {
        return 'dev';
    }
    if (environment === base_RuntimeEnvironment.Staging) {
        return 'staging';
    }
    return 'prod';
};
const toRuntimeEnvironment = (environment)=>{
    if (environment === 'dev') {
        return base_RuntimeEnvironment.Development;
    }
    if (environment === 'staging') {
        return base_RuntimeEnvironment.Staging;
    }
    return base_RuntimeEnvironment.Production;
};
