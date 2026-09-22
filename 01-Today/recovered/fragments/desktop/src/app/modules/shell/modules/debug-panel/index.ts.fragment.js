// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/index.ts.
// The original TypeScript and import graph are not restored.














class ShellDebugPanel {
    get available() {
        return true;
    }
    async install() {
        this.shortcut.install();
        this.ipc.install();
        this.deepLinkDebug.install();
        this.logsDebug.install();
        this.recordDebug.install();
        this.toolPermissions.install();
        await this.rpcDebug.install();
        await this.socketDebug.install();
        await this.toolsDebug.install();
    }
    show() {
        this.window.show();
    }
}
__decorate([
    inject(ShellDebugIpc),
    __metadata("design:type", typeof ShellDebugIpc === "undefined" ? Object : ShellDebugIpc)
], ShellDebugPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellDebugWindow),
    __metadata("design:type", typeof ShellDebugWindow === "undefined" ? Object : ShellDebugWindow)
], ShellDebugPanel.prototype, "window", void 0);
__decorate([
    inject(ShellDeepLinkDebugPanel),
    __metadata("design:type", typeof ShellDeepLinkDebugPanel === "undefined" ? Object : ShellDeepLinkDebugPanel)
], ShellDebugPanel.prototype, "deepLinkDebug", void 0);
__decorate([
    inject(ShellToolPermissionsPanel),
    __metadata("design:type", typeof ShellToolPermissionsPanel === "undefined" ? Object : ShellToolPermissionsPanel)
], ShellDebugPanel.prototype, "toolPermissions", void 0);
__decorate([
    inject(ShellToolsDebugPanel),
    __metadata("design:type", typeof ShellToolsDebugPanel === "undefined" ? Object : ShellToolsDebugPanel)
], ShellDebugPanel.prototype, "toolsDebug", void 0);
__decorate([
    inject(ShellRecordDebugPanel),
    __metadata("design:type", typeof ShellRecordDebugPanel === "undefined" ? Object : ShellRecordDebugPanel)
], ShellDebugPanel.prototype, "recordDebug", void 0);
__decorate([
    inject(ShellRpcDebugPanel),
    __metadata("design:type", typeof ShellRpcDebugPanel === "undefined" ? Object : ShellRpcDebugPanel)
], ShellDebugPanel.prototype, "rpcDebug", void 0);
__decorate([
    inject(ShellLogsDebugPanel),
    __metadata("design:type", typeof ShellLogsDebugPanel === "undefined" ? Object : ShellLogsDebugPanel)
], ShellDebugPanel.prototype, "logsDebug", void 0);
__decorate([
    inject(ShellDebugShortcut),
    __metadata("design:type", typeof ShellDebugShortcut === "undefined" ? Object : ShellDebugShortcut)
], ShellDebugPanel.prototype, "shortcut", void 0);
__decorate([
    inject(ShellSocketDebugPanel),
    __metadata("design:type", typeof ShellSocketDebugPanel === "undefined" ? Object : ShellSocketDebugPanel)
], ShellDebugPanel.prototype, "socketDebug", void 0);
ShellDebugPanel = __decorate([
    injectable()
], ShellDebugPanel);
