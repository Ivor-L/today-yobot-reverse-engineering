// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/index.ts.
// The original TypeScript and import graph are not restored.









class FileLogsPushTarget extends LogsPushTarget {
    async push(entry) {
        if (!this.store.append(entry)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local log store is unavailable.');
        }
    }
    upload(onProgress) {
        return this.uploader.upload({
            ...onProgress === undefined ? {} : {
                onProgress
            },
            trigger: 'local_logs_upload'
        });
    }
    uploadRemote(requestId, signal, onProgress) {
        return this.uploader.upload({
            ...onProgress === undefined ? {} : {
                onProgress
            },
            remoteUploadRequestId: requestId,
            signal,
            trigger: 'remote_logs_upload'
        });
    }
    async openDirectory() {
        await this.store.openDirectory();
    }
    flush() {
        this.store.flush();
    }
    dispose() {
        this.store.dispose();
    }
    constructor(...args){
        super(...args), this.target = (/* inlined export .PushTarget.File */"file");
    }
}
__decorate([
    inject(FileLogStore),
    __metadata("design:type", typeof FileLogStore === "undefined" ? Object : FileLogStore)
], FileLogsPushTarget.prototype, "store", void 0);
__decorate([
    inject(FileLogsUploader),
    __metadata("design:type", typeof FileLogsUploader === "undefined" ? Object : FileLogsUploader)
], FileLogsPushTarget.prototype, "uploader", void 0);
FileLogsPushTarget = __decorate([
    injectable()
], FileLogsPushTarget);
