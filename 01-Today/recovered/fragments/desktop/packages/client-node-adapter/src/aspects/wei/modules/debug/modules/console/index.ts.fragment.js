// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/debug/modules/console/index.ts.
// The original TypeScript and import graph are not restored.








class DebugConsoleWebService extends readonly_events_ReadonlyEvents {
    async open() {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'The Host Debug Console is unavailable in this environment');
        }
        try {
            await this.shell.openConsole();
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The Host Debug Console could not be opened');
        }
    }
}
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], DebugConsoleWebService.prototype, "shell", void 0);
__decorate([
    inject(DEBUG_CAPABLE),
    __metadata("design:type", Boolean)
], DebugConsoleWebService.prototype, "debugCapable", void 0);
DebugConsoleWebService = __decorate([
    logCalls(),
    injectable()
], DebugConsoleWebService);
