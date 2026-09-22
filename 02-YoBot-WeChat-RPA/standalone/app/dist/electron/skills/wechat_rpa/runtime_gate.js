function initialState() {
    const action = process.env.RPA_UPDATE_ACTION;
    return {
        blocked: process.env.RPA_UPDATE_BLOCKED === 'true',
        action: action === 'block_start' || action === 'stop_now' ? action : 'allow',
        requiredVersion: process.env.RPA_UPDATE_REQUIRED_VERSION || '',
        requiredVersionCode: Number(process.env.RPA_UPDATE_REQUIRED_VERSION_CODE) || 0,
    };
}
let state = initialState();
export class RpaClientUpdateRequiredError extends Error {
    gate;
    code = 'CLIENT_UPDATE_REQUIRED';
    constructor(gate) {
        super(gate.requiredVersion
            ? `当前客户端版本存在已知 RPA 风险，请先升级到 ${gate.requiredVersion} 后再使用 RPA。`
            : '当前客户端版本存在已知 RPA 风险，请先完成客户端升级后再使用 RPA。');
        this.gate = gate;
        this.name = 'RpaClientUpdateRequiredError';
    }
}
export function getRpaRuntimeGate() {
    return { ...state };
}
export function updateRpaRuntimeGate(input) {
    const action = input?.RPA_UPDATE_ACTION ?? input?.action;
    const requiredVersion = input?.RPA_UPDATE_REQUIRED_VERSION ?? input?.requiredVersion;
    const requiredVersionCode = input?.RPA_UPDATE_REQUIRED_VERSION_CODE ?? input?.requiredVersionCode;
    const blocked = input?.RPA_UPDATE_BLOCKED ?? input?.blocked;
    state = {
        blocked: blocked === true || blocked === 'true',
        action: action === 'block_start' || action === 'stop_now' ? action : 'allow',
        requiredVersion: typeof requiredVersion === 'string' ? requiredVersion : '',
        requiredVersionCode: Number(requiredVersionCode) || 0,
    };
    return getRpaRuntimeGate();
}
export function assertRpaRuntimeAllowed() {
    if (state.blocked && state.action !== 'allow') {
        throw new RpaClientUpdateRequiredError(getRpaRuntimeGate());
    }
}
