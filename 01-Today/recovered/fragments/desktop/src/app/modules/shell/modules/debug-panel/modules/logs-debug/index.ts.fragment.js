// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/logs-debug/index.ts.
// The original TypeScript and import graph are not restored.







class ShellLogsDebugPanel {
    get available() {
        return true;
    }
    install() {
        if (this.installed) {
            return;
        }
        this.installed = true;
        this.ipc.install();
        this.window.setClosedHandler(this.handleWindowClosed);
    }
    async show() {
        await this.window.show();
    }
    constructor(){
        this.installed = false;
        this.handleWindowClosed = ()=>{
            const stop = async ()=>{
                try {
                    await this.observer.stop();
                } catch  {
                // Closing the window must not fail because an adapter subscription already ended.
                }
            };
            stop();
        };
    }
}
__decorate([
    inject(ShellLogsDebugIpc),
    __metadata("design:type", typeof ShellLogsDebugIpc === "undefined" ? Object : ShellLogsDebugIpc)
], ShellLogsDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellLogsDebugObserver),
    __metadata("design:type", typeof ShellLogsDebugObserver === "undefined" ? Object : ShellLogsDebugObserver)
], ShellLogsDebugPanel.prototype, "observer", void 0);
__decorate([
    inject(ShellLogsDebugWindow),
    __metadata("design:type", typeof ShellLogsDebugWindow === "undefined" ? Object : ShellLogsDebugWindow)
], ShellLogsDebugPanel.prototype, "window", void 0);
ShellLogsDebugPanel = __decorate([
    injectable()
], ShellLogsDebugPanel);
