// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/runtime/index.ts.
// The original TypeScript and import graph are not restored.









class RuntimeWebService extends readonly_events_ReadonlyEvents {
    async getRuntimeInfo() {
        const system = await this.cpi.system.getSystemInfo();
        return {
            host: (/* inlined export .ClientRuntimeHost.Electron */"electron"),
            platform: toClientRuntimePlatform(system.platform),
            surface: this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell")
        };
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], RuntimeWebService.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_WEB_REQUEST_CONTEXT),
    __metadata("design:type", typeof ClientNodeWebRequestContext === "undefined" ? Object : ClientNodeWebRequestContext)
], RuntimeWebService.prototype, "requestContext", void 0);
RuntimeWebService = __decorate([
    logCalls(),
    injectable()
], RuntimeWebService);
