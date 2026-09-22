// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tools-debug/index.ts.
// The original TypeScript and import graph are not restored.







class ShellToolsDebugPanel {
    get available() {
        return true;
    }
    async install() {
        this.ipc.install();
        if (this.subscription) {
            return;
        }
        this.subscription = await this.adapter.sei.debug.tools.subscribe('recorded', (record)=>{
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
], ShellToolsDebugPanel.prototype, "adapter", void 0);
__decorate([
    inject(ShellToolsDebugIpc),
    __metadata("design:type", typeof ShellToolsDebugIpc === "undefined" ? Object : ShellToolsDebugIpc)
], ShellToolsDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellToolsDebugWindow),
    __metadata("design:type", typeof ShellToolsDebugWindow === "undefined" ? Object : ShellToolsDebugWindow)
], ShellToolsDebugPanel.prototype, "window", void 0);
ShellToolsDebugPanel = __decorate([
    injectable()
], ShellToolsDebugPanel);
