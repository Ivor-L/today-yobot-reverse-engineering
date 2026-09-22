// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/debug/index.ts.
// The original TypeScript and import graph are not restored.






class DebugWebService {
}
__decorate([
    inject(DebugSocketWebService),
    __metadata("design:type", typeof IWebExtendedDebugSocketModule === "undefined" ? Object : IWebExtendedDebugSocketModule)
], DebugWebService.prototype, "socket", void 0);
__decorate([
    inject(DebugConsoleWebService),
    __metadata("design:type", typeof IWebExtendedDebugConsoleModule === "undefined" ? Object : IWebExtendedDebugConsoleModule)
], DebugWebService.prototype, "console", void 0);
DebugWebService = __decorate([
    injectable()
], DebugWebService);
