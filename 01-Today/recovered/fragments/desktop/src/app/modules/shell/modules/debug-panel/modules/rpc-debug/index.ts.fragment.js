// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/rpc-debug/index.ts.
// The original TypeScript and import graph are not restored.







class ShellRpcDebugPanel {
    get available() {
        return true;
    }
    async install() {
        this.ipc.install();
        if (this.subscription) {
            return;
        }
        this.subscription = await this.adapter.sei.debug.rpc.subscribe('recorded', (record)=>{
            this.window.publish(record);
        });
    }
    async show() {
        await this.window.show();
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellRpcDebugPanel.prototype, "adapter", void 0);
__decorate([
    inject(ShellRpcDebugIpc),
    __metadata("design:type", typeof ShellRpcDebugIpc === "undefined" ? Object : ShellRpcDebugIpc)
], ShellRpcDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellRpcDebugWindow),
    __metadata("design:type", typeof ShellRpcDebugWindow === "undefined" ? Object : ShellRpcDebugWindow)
], ShellRpcDebugPanel.prototype, "window", void 0);
ShellRpcDebugPanel = __decorate([
    injectable()
], ShellRpcDebugPanel);
