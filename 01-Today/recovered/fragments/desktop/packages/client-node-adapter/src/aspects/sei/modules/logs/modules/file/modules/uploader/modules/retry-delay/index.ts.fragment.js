// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/modules/uploader/modules/retry-delay/index.ts.
// The original TypeScript and import graph are not restored.




class FileLogUploadRetryDelay {
    async wait(retryNumber) {
        const exponent = Math.max(0, retryNumber - 1);
        const delayMs = Math.min((/* inlined export .FILE_LOG_UPLOAD_RETRY_INITIAL_DELAY_MS */250) * 2 ** exponent, (/* inlined export .FILE_LOG_UPLOAD_RETRY_MAX_DELAY_MS */2000));
        await new Promise((resolve)=>{
            setTimeout(resolve, delayMs);
        });
    }
}
FileLogUploadRetryDelay = __decorate([
    injectable()
], FileLogUploadRetryDelay);
