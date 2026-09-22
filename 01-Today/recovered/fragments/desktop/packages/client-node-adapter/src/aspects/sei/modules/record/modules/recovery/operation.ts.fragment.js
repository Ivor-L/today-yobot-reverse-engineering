// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/recovery/operation.ts.
// The original TypeScript and import graph are not restored.

/** Abort the owner's wait even when an underlying transport ignores cancellation. */ const awaitRecordUpload = async (operation, signal)=>{
    let onAbort;
    const cancelled = new Promise((_resolve, reject)=>{
        onAbort = ()=>{
            // Terminal capture cleanup must still drain transport before cancelling its capture.
            if (signal.reason !== 'record-terminal') {
                reject(new DOMException('Recording upload was stopped.', 'AbortError'));
            }
        };
        signal.addEventListener('abort', onAbort, {
            once: true
        });
        if (signal.aborted) {
            onAbort();
        }
    });
    try {
        return await Promise.race([
            operation,
            cancelled
        ]);
    } finally{
        if (onAbort) {
            signal.removeEventListener('abort', onAbort);
        }
    }
};
