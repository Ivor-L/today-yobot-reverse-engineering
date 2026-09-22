// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/index.ts.
// The original TypeScript and import graph are not restored.









class DebugShellService {
}
__decorate([
    inject(DebugSocketShellService),
    __metadata("design:type", typeof IShellExtendedDebugSocketModule === "undefined" ? Object : IShellExtendedDebugSocketModule)
], DebugShellService.prototype, "socket", void 0);
__decorate([
    inject(DebugUserSocketShellService),
    __metadata("design:type", typeof IShellExtendedDebugUserSocketModule === "undefined" ? Object : IShellExtendedDebugUserSocketModule)
], DebugShellService.prototype, "userSocket", void 0);
__decorate([
    inject(DebugRpcShellService),
    __metadata("design:type", typeof IShellExtendedDebugRpcModule === "undefined" ? Object : IShellExtendedDebugRpcModule)
], DebugShellService.prototype, "rpc", void 0);
__decorate([
    inject(DebugLogsShellService),
    __metadata("design:type", typeof IShellExtendedDebugLogsModule === "undefined" ? Object : IShellExtendedDebugLogsModule)
], DebugShellService.prototype, "logs", void 0);
__decorate([
    inject(DebugToolsShellService),
    __metadata("design:type", typeof IShellExtendedDebugToolsModule === "undefined" ? Object : IShellExtendedDebugToolsModule)
], DebugShellService.prototype, "tools", void 0);
DebugShellService = __decorate([
    injectable()
], DebugShellService);
