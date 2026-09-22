// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/update/index.ts.
// The original TypeScript and import graph are not restored.






class UpdateWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    getVersionInfo() {
        return this.shell.getVersionInfo();
    }
    getUpdateState() {
        return this.shell.getUpdateState();
    }
    performUpdateAction(params) {
        const { action } = params;
        return this.shell.performUpdateAction({
            action
        });
    }
}
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof UpdateShellService === "undefined" ? Object : UpdateShellService)
], UpdateWebService.prototype, "shell", void 0);
UpdateWebService = __decorate([
    logCalls(),
    injectable()
], UpdateWebService);
