// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/tools/index.ts.
// The original TypeScript and import graph are not restored.






class ToolsNativeService {
    subscribe(eventName, listener) {
        return this.socket.subscribeNativeToolEvents(eventName, listener);
    }
    async completeInvocation(result) {
        await this.socket.completeNativeToolInvocation(result);
    }
}
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof SocketShellService === "undefined" ? Object : SocketShellService)
], ToolsNativeService.prototype, "socket", void 0);
ToolsNativeService = __decorate([
    logCalls(RpcLogTarget.Noop),
    injectable()
], ToolsNativeService);
