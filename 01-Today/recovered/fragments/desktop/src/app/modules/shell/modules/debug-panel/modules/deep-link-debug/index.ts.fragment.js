// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/deep-link-debug/index.ts.
// The original TypeScript and import graph are not restored.






class ShellDeepLinkDebugPanel {
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
    inject(ShellDeepLinkDebugIpc),
    __metadata("design:type", typeof ShellDeepLinkDebugIpc === "undefined" ? Object : ShellDeepLinkDebugIpc)
], ShellDeepLinkDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellDeepLinkDebugWindow),
    __metadata("design:type", typeof ShellDeepLinkDebugWindow === "undefined" ? Object : ShellDeepLinkDebugWindow)
], ShellDeepLinkDebugPanel.prototype, "window", void 0);
ShellDeepLinkDebugPanel = __decorate([
    injectable()
], ShellDeepLinkDebugPanel);
