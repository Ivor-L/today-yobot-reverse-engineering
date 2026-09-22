// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/runtime-diagnostics/modules/web-runtime/utils.ts.
// The original TypeScript and import graph are not restored.

const resolveWebRuntimeDiagnosticDuration = (value)=>{
    if (!Number.isFinite(value) || value < 0) {
        return undefined;
    }
    return Math.min(Number.MAX_SAFE_INTEGER, Math.round(value));
};
const resolveWebRuntimeDiagnosticInteger = (value)=>{
    if (!Number.isSafeInteger(value) || value < 0) {
        return undefined;
    }
    return value;
};
const resolveWebRuntimeDiagnosticStatusCode = (value)=>{
    if (value === undefined || !Number.isInteger(value) || value < 100 || value > 599) {
        return undefined;
    }
    return value;
};
