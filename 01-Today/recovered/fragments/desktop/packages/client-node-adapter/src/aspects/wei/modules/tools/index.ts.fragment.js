// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/tools/index.ts.
// The original TypeScript and import graph are not restored.







class ToolsWebService {
    getAuthorization() {
        return this.shell.getAuthorization();
    }
    setAuthorization(params) {
        return this.shell.setAuthorization(params);
    }
    scanFileInventory() {
        return this.shell.scanFileInventory();
    }
    uploadFileInventory() {
        return this.shell.uploadFileInventory();
    }
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    listTools() {
        return this.shell.listTools();
    }
    getToolInfo(params) {
        const { toolId } = params;
        return this.shell.getToolInfo({
            toolId
        });
    }
    getRunningTasks() {
        return this.shell.getRunningTasks();
    }
    getTaskInfo(params) {
        const { taskId } = params;
        return this.shell.getTaskInfo({
            taskId
        });
    }
    cancelTask(params) {
        const { taskId } = params;
        return this.shell.cancelTask({
            taskId
        });
    }
    startTask(params) {
        const { input, timeoutMs, toolId } = params;
        return this.shell.startTask({
            input,
            ...timeoutMs === undefined ? {} : {
                timeoutMs
            },
            toolId
        });
    }
}
__decorate([
    inject(ToolsShellService),
    __metadata("design:type", typeof ToolsShellService === "undefined" ? Object : ToolsShellService)
], ToolsWebService.prototype, "shell", void 0);
ToolsWebService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], ToolsWebService);
