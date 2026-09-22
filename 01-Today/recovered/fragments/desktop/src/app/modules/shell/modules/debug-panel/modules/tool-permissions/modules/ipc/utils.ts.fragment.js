// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tool-permissions/modules/ipc/utils.ts.
// The original TypeScript and import graph are not restored.


const parseToolPermissionsReset = (value)=>{
    if (typeof value !== 'object' || value === null || !('revision' in value) || typeof value.revision !== 'string' || value.revision.trim().length === 0) {
        throw new Error('A tool permissions revision is required');
    }
    return {
        revision: value.revision
    };
};
const parseToolPermissionsChange = (value)=>{
    const { revision } = parseToolPermissionsReset(value);
    if (typeof value !== 'object' || value === null || !('allowed' in value) || typeof value.allowed !== 'boolean' || !('toolIds' in value) || !Array.isArray(value.toolIds) || value.toolIds.length === 0 || !Array.from(value.toolIds).every((id)=>typeof id === 'string' && id.trim().length > 0)) {
        throw new Error('Tool identifiers and a boolean permission are required');
    }
    return {
        revision,
        toolIds: [
            ...value.toolIds
        ],
        allowed: value.allowed
    };
};
const parseToolPermissionRejectionCode = (value)=>{
    const { revision } = parseToolPermissionsReset(value);
    if (typeof value !== 'object' || value === null || !('code' in value) || value.code !== base_InterfaceErrorCode.PermissionRequired && value.code !== base_InterfaceErrorCode.PermissionDenied) {
        throw new Error('A permission-required or permission-denied rejection code is required');
    }
    return {
        revision,
        code: value.code
    };
};
const parseToolPermissionsMode = (value)=>{
    const { revision } = parseToolPermissionsReset(value);
    if (typeof value !== 'object' || value === null || !('mode' in value) || value.mode !== 'default' && value.mode !== 'deny-all') {
        throw new Error('A default or deny-all permission mode is required');
    }
    return {
        revision,
        mode: value.mode
    };
};
