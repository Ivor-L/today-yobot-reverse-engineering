// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/index.ts.
// The original TypeScript and import graph are not restored.

















class WebExtendedAspect {
}
__decorate([
    inject(RuntimeWebService),
    __metadata("design:type", typeof RuntimeWebService === "undefined" ? Object : RuntimeWebService)
], WebExtendedAspect.prototype, "runtime", void 0);
__decorate([
    inject(AccountWebService),
    __metadata("design:type", typeof AccountWebService === "undefined" ? Object : AccountWebService)
], WebExtendedAspect.prototype, "account", void 0);
__decorate([
    inject(ShellWebService),
    __metadata("design:type", typeof ShellWebService === "undefined" ? Object : ShellWebService)
], WebExtendedAspect.prototype, "shell", void 0);
__decorate([
    inject(ToolsWebService),
    __metadata("design:type", typeof ToolsWebService === "undefined" ? Object : ToolsWebService)
], WebExtendedAspect.prototype, "tools", void 0);
__decorate([
    inject(PermissionsWebService),
    __metadata("design:type", typeof PermissionsWebService === "undefined" ? Object : PermissionsWebService)
], WebExtendedAspect.prototype, "permissions", void 0);
__decorate([
    inject(SocketWebService),
    __metadata("design:type", typeof SocketWebService === "undefined" ? Object : SocketWebService)
], WebExtendedAspect.prototype, "socket", void 0);
__decorate([
    inject(PreferencesWebService),
    __metadata("design:type", typeof PreferencesWebService === "undefined" ? Object : PreferencesWebService)
], WebExtendedAspect.prototype, "preferences", void 0);
__decorate([
    inject(LogsWebService),
    __metadata("design:type", typeof LogsWebService === "undefined" ? Object : LogsWebService)
], WebExtendedAspect.prototype, "logs", void 0);
__decorate([
    inject(ShortcutsWebService),
    __metadata("design:type", typeof ShortcutsWebService === "undefined" ? Object : ShortcutsWebService)
], WebExtendedAspect.prototype, "shortcuts", void 0);
__decorate([
    inject(FeaturesWebService),
    __metadata("design:type", typeof FeaturesWebService === "undefined" ? Object : FeaturesWebService)
], WebExtendedAspect.prototype, "features", void 0);
__decorate([
    inject(RecordWebService),
    __metadata("design:type", typeof RecordWebService === "undefined" ? Object : RecordWebService)
], WebExtendedAspect.prototype, "record", void 0);
__decorate([
    inject(UpdateWebService),
    __metadata("design:type", typeof UpdateWebService === "undefined" ? Object : UpdateWebService)
], WebExtendedAspect.prototype, "update", void 0);
__decorate([
    inject(DebugWebService),
    __metadata("design:type", typeof DebugWebService === "undefined" ? Object : DebugWebService)
], WebExtendedAspect.prototype, "debug", void 0);
WebExtendedAspect = __decorate([
    injectable()
], WebExtendedAspect);
