// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/socket/index.ts.
// The original TypeScript and import graph are not restored.






class DebugSocketShellService extends readonly_events_ReadonlyEvents {
    async getState() {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, UNSUPPORTED_SOCKET_DEBUG_MESSAGE);
    }
    async setPreferredTransport(params) {
        const { transport: _transport } = params;
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, UNSUPPORTED_SOCKET_DEBUG_MESSAGE);
    }
    async setOffline(params) {
        const { enabled: _enabled } = params;
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, UNSUPPORTED_SOCKET_DEBUG_MESSAGE);
    }
    async setPacketLoss(params) {
        const { enabled: _enabled } = params;
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, UNSUPPORTED_SOCKET_DEBUG_MESSAGE);
    }
    async disconnectWorker() {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, UNSUPPORTED_SOCKET_DEBUG_MESSAGE);
    }
}
DebugSocketShellService = __decorate([
    injectable()
], DebugSocketShellService);
