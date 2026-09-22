// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/socket/index.ts.
// The original TypeScript and import graph are not restored.






class SocketWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    getSocketState() {
        return this.shell.getSocketState();
    }
    forceSync() {
        return this.shell.forceSync();
    }
}
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof SocketShellService === "undefined" ? Object : SocketShellService)
], SocketWebService.prototype, "shell", void 0);
SocketWebService = __decorate([
    logCalls(),
    injectable()
], SocketWebService);
