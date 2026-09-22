// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/debug/modules/socket/index.ts.
// The original TypeScript and import graph are not restored.






class DebugSocketWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    getState() {
        return this.shell.getState();
    }
    setPreferredTransport(params) {
        const { transport } = params;
        return this.shell.setPreferredTransport({
            transport
        });
    }
    setOffline(params) {
        const { enabled } = params;
        return this.shell.setOffline({
            enabled
        });
    }
    setPacketLoss(params) {
        const { enabled } = params;
        return this.shell.setPacketLoss({
            enabled
        });
    }
    disconnectWorker() {
        return this.shell.disconnectWorker();
    }
}
__decorate([
    inject(DebugSocketShellService),
    __metadata("design:type", typeof DebugSocketShellService === "undefined" ? Object : DebugSocketShellService)
], DebugSocketWebService.prototype, "shell", void 0);
DebugSocketWebService = __decorate([
    logCalls(),
    injectable()
], DebugSocketWebService);
