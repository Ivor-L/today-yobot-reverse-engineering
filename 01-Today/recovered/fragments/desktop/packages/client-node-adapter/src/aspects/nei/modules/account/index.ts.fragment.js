// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/account/index.ts.
// The original TypeScript and import graph are not restored.








class AccountNativeService extends readonly_events_ReadonlyEvents {
    getFreshAuthContext() {
        return this.shell.getFreshNativeAuthContext();
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], AccountNativeService.prototype, "shell", void 0);
AccountNativeService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], AccountNativeService);
