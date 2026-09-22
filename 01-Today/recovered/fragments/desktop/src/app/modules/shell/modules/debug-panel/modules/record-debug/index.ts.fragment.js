// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/record-debug/index.ts.
// The original TypeScript and import graph are not restored.






class ShellRecordDebugPanel {
    get available() {
        return true;
    }
    install() {
        if (this.installed) {
            return;
        }
        this.installed = true;
        this.ipc.install();
    }
    async show() {
        await this.window.show();
    }
    constructor(){
        this.installed = false;
    }
}
__decorate([
    inject(ShellRecordDebugIpc),
    __metadata("design:type", typeof ShellRecordDebugIpc === "undefined" ? Object : ShellRecordDebugIpc)
], ShellRecordDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellRecordDebugWindow),
    __metadata("design:type", typeof ShellRecordDebugWindow === "undefined" ? Object : ShellRecordDebugWindow)
], ShellRecordDebugPanel.prototype, "window", void 0);
ShellRecordDebugPanel = __decorate([
    injectable()
], ShellRecordDebugPanel);
