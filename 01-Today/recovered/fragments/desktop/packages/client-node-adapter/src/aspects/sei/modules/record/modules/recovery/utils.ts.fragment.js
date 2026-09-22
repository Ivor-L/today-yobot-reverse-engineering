// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/recovery/utils.ts.
// The original TypeScript and import graph are not restored.


const isRecordUploadRecovery = (value)=>{
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const state = value;
    return Number.isSafeInteger(state.attempts) && state.attempts >= 0 && state.attempts <= (/* inlined export .RECORD_UPLOAD_MAX_RETRIES */10) && typeof state.stopped === 'boolean' && (state.retryAtEpochMs === undefined || Number.isFinite(state.retryAtEpochMs) && state.retryAtEpochMs >= 0) && (state.offlineSinceEpochMs === undefined || Number.isFinite(state.offlineSinceEpochMs) && state.offlineSinceEpochMs >= 0);
};
