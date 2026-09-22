// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/logs/index.ts.
// The original TypeScript and import graph are not restored.






class LogsNativeService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    push(params) {
        return this.shell.pushFrom('native', params);
    }
    pushMetrics(params) {
        return this.shell.pushMetricsFrom('native', params);
    }
    uploadLocal() {
        return this.shell.uploadLocal();
    }
}
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof LogsShellService === "undefined" ? Object : LogsShellService)
], LogsNativeService.prototype, "shell", void 0);
LogsNativeService = __decorate([
    logCalls(RpcLogTarget.Noop),
    injectable()
], LogsNativeService);
