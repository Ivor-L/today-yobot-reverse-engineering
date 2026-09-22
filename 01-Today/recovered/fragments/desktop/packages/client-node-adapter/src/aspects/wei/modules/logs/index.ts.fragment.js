// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/logs/index.ts.
// The original TypeScript and import graph are not restored.






class LogsWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    push(params) {
        return this.shell.pushFrom('web', params);
    }
    pushMetrics(params) {
        return this.shell.pushMetricsFrom('web', params);
    }
    uploadLocal() {
        return this.shell.uploadLocal();
    }
}
__decorate([
    inject(LogsShellService),
    __metadata("design:type", typeof LogsShellService === "undefined" ? Object : LogsShellService)
], LogsWebService.prototype, "shell", void 0);
LogsWebService = __decorate([
    logCalls(RpcLogTarget.Noop),
    injectable()
], LogsWebService);
