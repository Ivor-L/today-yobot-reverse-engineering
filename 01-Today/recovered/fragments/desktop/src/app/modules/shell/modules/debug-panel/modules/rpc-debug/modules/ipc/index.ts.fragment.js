// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/rpc-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.







class ShellRpcDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(RPC_DEBUG_CLOSE_CHANNEL);
        ipc.removeHandler(RPC_DEBUG_SUBSCRIBE_CHANNEL);
        ipc.removeHandler(RPC_DEBUG_UNSUBSCRIBE_CHANNEL);
        ipc.handle(RPC_DEBUG_CLOSE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.close();
        });
        ipc.handle(RPC_DEBUG_SUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
        });
        ipc.handle(RPC_DEBUG_UNSUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted RPC debug IPC sender');
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellRpcDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellRpcDebugWindow),
    __metadata("design:type", typeof ShellRpcDebugWindow === "undefined" ? Object : ShellRpcDebugWindow)
], ShellRpcDebugIpc.prototype, "window", void 0);
ShellRpcDebugIpc = __decorate([
    injectable()
], ShellRpcDebugIpc);
