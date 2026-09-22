// Compiled fragment from ./src/app/modules/node-network-inspection/modules/state/utils.ts.
// The original TypeScript and import graph are not restored.


const isDestinationConflictError = (error)=>error instanceof Error && 'code' in error && (error.code === 'EEXIST' || error.code === 'EPERM');
const state_utils_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const parseNodeNetworkInspectionState = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined;
    }
    const state = value;
    if (state.schemaVersion !== (/* inlined export .NODE_NETWORK_INSPECTION_STATE_SCHEMA_VERSION */1) || typeof state.enabled !== 'boolean') {
        return undefined;
    }
    return state.enabled;
};
