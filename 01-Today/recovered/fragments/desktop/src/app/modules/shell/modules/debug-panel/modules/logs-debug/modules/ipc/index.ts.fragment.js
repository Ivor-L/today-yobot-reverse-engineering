// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/logs-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.










class ShellLogsDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(LOGS_DEBUG_CLOSE_CHANNEL);
        ipc.removeHandler(LOGS_DEBUG_LIST_FILE_LOGS_CHANNEL);
        ipc.removeHandler(LOGS_DEBUG_LIST_TARGETS_CHANNEL);
        ipc.removeHandler(LOGS_DEBUG_SUBSCRIBE_CHANNEL);
        ipc.removeHandler(LOGS_DEBUG_UNSUBSCRIBE_CHANNEL);
        ipc.removeHandler(LOGS_DEBUG_UPLOAD_LOCAL_CHANNEL);
        ipc.handle(LOGS_DEBUG_CLOSE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
            await this.observer.stop();
            this.window.close();
        });
        ipc.handle(LOGS_DEBUG_LIST_FILE_LOGS_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            const params = this.parseFileLogsParams(value);
            return await this.adapter.sei.debug.logs.listFileLogs(params);
        });
        ipc.handle(LOGS_DEBUG_LIST_TARGETS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.logs.listTargets();
        });
        ipc.handle(LOGS_DEBUG_SUBSCRIBE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
            try {
                await this.observer.start();
            } catch (error) {
                this.window.setRendererSubscribed(false);
                throw error;
            }
        });
        ipc.handle(LOGS_DEBUG_UNSUBSCRIBE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
            await this.observer.stop();
        });
        ipc.handle(LOGS_DEBUG_UPLOAD_LOCAL_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.logUpload.startUpload();
        });
    }
    parseFileLogsParams(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new TypeError('The logs time range must be an object');
        }
        const { fromAt, toAt } = value;
        if (typeof fromAt !== 'number' || !Number.isSafeInteger(fromAt) || fromAt < 0 || typeof toAt !== 'number' || !Number.isSafeInteger(toAt) || fromAt >= toAt) {
            throw new TypeError('The logs time range must contain non-negative safe ascending timestamps');
        }
        return {
            fromAt,
            toAt
        };
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Logs debug IPC sender');
    }
}
__decorate([
    inject(ShellLogUploadPanel),
    __metadata("design:type", typeof ShellLogUploadPanel === "undefined" ? Object : ShellLogUploadPanel)
], ShellLogsDebugIpc.prototype, "logUpload", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellLogsDebugIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellLogsDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellLogsDebugWindow),
    __metadata("design:type", typeof ShellLogsDebugWindow === "undefined" ? Object : ShellLogsDebugWindow)
], ShellLogsDebugIpc.prototype, "window", void 0);
__decorate([
    inject(ShellLogsDebugObserver),
    __metadata("design:type", typeof ShellLogsDebugObserver === "undefined" ? Object : ShellLogsDebugObserver)
], ShellLogsDebugIpc.prototype, "observer", void 0);
ShellLogsDebugIpc = __decorate([
    injectable()
], ShellLogsDebugIpc);
