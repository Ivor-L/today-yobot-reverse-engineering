// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/recovery/index.ts.
// The original TypeScript and import graph are not restored.





class RecordUploadRecoveryMonitor {
    get online() {
        return external_electron_.net.isOnline();
    }
    start(tick) {
        this.stop();
        this.timer = setInterval(tick, (/* inlined export .RECORD_UPLOAD_RETRY_INTERVAL_MS */1000));
        this.timer.unref();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
    }
}
RecordUploadRecoveryMonitor = __decorate([
    injectable()
], RecordUploadRecoveryMonitor);
