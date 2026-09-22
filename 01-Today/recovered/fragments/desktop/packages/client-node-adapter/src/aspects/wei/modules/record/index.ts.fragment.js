// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/record/index.ts.
// The original TypeScript and import graph are not restored.







class RecordWebService {
    async subscribe(eventName, listener) {
        return await this.shell.subscribe(eventName, listener);
    }
    async getState() {
        return await this.shell.getState();
    }
    async start(params) {
        await this.shell.start(params);
    }
    async cancel() {
        await this.shell.cancel();
    }
    async setPaused(params) {
        const { paused } = params;
        await this.shell.setPaused({
            paused
        });
    }
    async stop() {
        await this.shell.stop();
    }
    async retry() {
        await this.shell.retry();
    }
    async exportAudio() {
        await this.shell.exportAudio();
    }
    async dismiss() {
        await this.shell.dismiss();
    }
}
__decorate([
    inject(RecordShellService),
    __metadata("design:type", typeof RecordShellService === "undefined" ? Object : RecordShellService)
], RecordWebService.prototype, "shell", void 0);
RecordWebService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], RecordWebService);
