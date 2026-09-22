// Compiled fragment from ./src/app/modules/shell/modules/log-upload/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.











class ShellLogUploadIpc {
    install() {
        const ipc = this.configuration.ipc;
        for (const channel of [
            LOG_UPLOAD_CLOSE_CHANNEL,
            LOG_UPLOAD_COPY_ID_CHANNEL,
            LOG_UPLOAD_GET_STATE_CHANNEL,
            LOG_UPLOAD_START_CHANNEL,
            LOG_UPLOAD_SUBSCRIBE_CHANNEL,
            LOG_UPLOAD_UNSUBSCRIBE_CHANNEL
        ]){
            ipc.removeHandler(channel);
        }
        ipc.handle(LOG_UPLOAD_CLOSE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.close();
        });
        ipc.handle(LOG_UPLOAD_GET_STATE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.logs.getLocalUploadState();
        });
        ipc.handle(LOG_UPLOAD_START_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.observer.startUpload();
        });
        ipc.handle(LOG_UPLOAD_COPY_ID_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            const state = await this.adapter.sei.logs.getLocalUploadState();
            if (state.status !== (/* inlined export .LocalLogUploadStatus.Completed */"completed") || !state.logId) {
                throw new Error('No completed upload ID is available');
            }
            external_electron_.clipboard.writeText(state.logId);
        });
        ipc.handle(LOG_UPLOAD_SUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
        });
        ipc.handle(LOG_UPLOAD_UNSUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted log upload IPC sender');
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellLogUploadIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellLogUploadIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellLogUploadObserver),
    __metadata("design:type", typeof ShellLogUploadObserver === "undefined" ? Object : ShellLogUploadObserver)
], ShellLogUploadIpc.prototype, "observer", void 0);
__decorate([
    inject(ShellLogUploadWindow),
    __metadata("design:type", typeof ShellLogUploadWindow === "undefined" ? Object : ShellLogUploadWindow)
], ShellLogUploadIpc.prototype, "window", void 0);
ShellLogUploadIpc = __decorate([
    injectable()
], ShellLogUploadIpc);
