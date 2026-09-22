// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/socket-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.








class ShellSocketDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(SOCKET_DEBUG_CLOSE_CHANNEL);
        ipc.removeHandler(SOCKET_DEBUG_GET_STATE_CHANNEL);
        ipc.removeHandler(SOCKET_DEBUG_SUBSCRIBE_CHANNEL);
        ipc.removeHandler(SOCKET_DEBUG_UNSUBSCRIBE_CHANNEL);
        ipc.handle(SOCKET_DEBUG_CLOSE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.close();
        });
        ipc.handle(SOCKET_DEBUG_GET_STATE_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.socket.getSocketState();
        });
        ipc.handle(SOCKET_DEBUG_SUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
        });
        ipc.handle(SOCKET_DEBUG_UNSUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Socket debug IPC sender');
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellSocketDebugIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellSocketDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellSocketDebugWindow),
    __metadata("design:type", typeof ShellSocketDebugWindow === "undefined" ? Object : ShellSocketDebugWindow)
], ShellSocketDebugIpc.prototype, "window", void 0);
ShellSocketDebugIpc = __decorate([
    injectable()
], ShellSocketDebugIpc);
