// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/shell/index.ts.
// The original TypeScript and import graph are not restored.











class ShellWebService {
    subscribe(eventName, listener) {
        const surface = this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell");
        if (surface !== (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell")) {
            return createNoopSubscription();
        }
        return this.shell.subscribe(eventName, listener);
    }
    async activate() {
        await this.shell.activate();
    }
    async dismiss() {
        const surface = this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell");
        await this.shell.dismiss(surface);
    }
    async openExternal(params) {
        const { url } = params;
        if (!isAllowedExternalUrl(url)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Shell external URL must use HTTP or HTTPS');
        }
        await this.shell.openExternal(url);
    }
    async openWebAuthenticationSession(params) {
        await this.webAuthentication.open(params);
    }
    async quitApplication() {
        const surface = this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell");
        if (surface !== (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Application quit is only available from the main application surface');
        }
        if (!this.update.canQuitForRequiredUpdate()) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Application quit is only available while a required update is presented');
        }
        await this.shell.quit();
    }
    async setSize(params) {
        if (!isValidSurfaceSize(params)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Shell surface dimensions must be positive safe integers');
        }
        const surface = this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell");
        const applied = await this.shell.setSize(surface, params);
        if (!applied) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Host surface size could not be applied');
        }
    }
}
__decorate([
    inject(CLIENT_NODE_SHELL),
    __metadata("design:type", typeof ClientNodeShellFacade === "undefined" ? Object : ClientNodeShellFacade)
], ShellWebService.prototype, "shell", void 0);
__decorate([
    inject(CLIENT_NODE_WEB_REQUEST_CONTEXT),
    __metadata("design:type", typeof ClientNodeWebRequestContext === "undefined" ? Object : ClientNodeWebRequestContext)
], ShellWebService.prototype, "requestContext", void 0);
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], ShellWebService.prototype, "update", void 0);
__decorate([
    inject(ShellWebAuthentication),
    __metadata("design:type", typeof ShellWebAuthentication === "undefined" ? Object : ShellWebAuthentication)
], ShellWebService.prototype, "webAuthentication", void 0);
ShellWebService = __decorate([
    logCalls(),
    injectable()
], ShellWebService);
