// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/socket-debug/index.ts.
// The original TypeScript and import graph are not restored.







class ShellSocketDebugPanel {
    get available() {
        return true;
    }
    async install() {
        this.ipc.install();
        if (this.subscription) {
            return;
        }
        this.subscription = await this.adapter.sei.debug.userSocket.subscribe('recorded', (record)=>{
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
], ShellSocketDebugPanel.prototype, "adapter", void 0);
__decorate([
    inject(ShellSocketDebugIpc),
    __metadata("design:type", typeof ShellSocketDebugIpc === "undefined" ? Object : ShellSocketDebugIpc)
], ShellSocketDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellSocketDebugWindow),
    __metadata("design:type", typeof ShellSocketDebugWindow === "undefined" ? Object : ShellSocketDebugWindow)
], ShellSocketDebugPanel.prototype, "window", void 0);
ShellSocketDebugPanel = __decorate([
    injectable()
], ShellSocketDebugPanel);
