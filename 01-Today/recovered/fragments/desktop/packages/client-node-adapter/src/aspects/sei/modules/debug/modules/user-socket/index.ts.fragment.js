// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/user-socket/index.ts.
// The original TypeScript and import graph are not restored.








class DebugUserSocketShellService extends readonly_events_ReadonlyEvents {
    async subscribe(eventName, listener) {
        this.assertSupported();
        return super.subscribe(eventName, listener);
    }
    /** Records one event emitted by the active Node-owned User Socket. */ record(event) {
        if (!this.debugCapable) {
            return;
        }
        const record = toDebugSocketPacketRecord(event);
        if (!record) {
            return;
        }
        this.emit('recorded', record);
    }
    assertSupported() {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'User Socket debugging is unavailable in this environment');
        }
    }
}
__decorate([
    inject(DEBUG_CAPABLE),
    __metadata("design:type", Boolean)
], DebugUserSocketShellService.prototype, "debugCapable", void 0);
DebugUserSocketShellService = __decorate([
    injectable()
], DebugUserSocketShellService);
