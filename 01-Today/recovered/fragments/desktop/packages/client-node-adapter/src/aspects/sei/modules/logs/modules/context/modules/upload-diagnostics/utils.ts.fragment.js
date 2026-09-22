// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/context/modules/upload-diagnostics/utils.ts.
// The original TypeScript and import graph are not restored.


const boundDiagnosticString = (value)=>{
    if (typeof value !== 'string') {
        return undefined;
    }
    const normalized = value.trim().slice(0, (/* inlined export .LOG_UPLOAD_DIAGNOSTIC_STRING_LIMIT */128));
    if (normalized.length === 0) {
        return undefined;
    }
    return normalized;
};
