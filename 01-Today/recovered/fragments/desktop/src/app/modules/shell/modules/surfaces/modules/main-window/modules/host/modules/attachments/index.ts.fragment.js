// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/host/modules/attachments/index.ts.
// The original TypeScript and import graph are not restored.







class ShellMainWindowAttachments {
    attach(window) {
        this.shortcuts.attachWebContents(window.webContents);
        this.errorPage.attach(window.webContents);
        this.debugWindow.attach(window);
    }
    detach(window, webContents) {
        this.debugWindow.detach(window);
        this.shortcuts.detachWebContents(webContents);
        this.errorPage.detach(webContents);
    }
}
__decorate([
    inject(ShellDebugWindow),
    __metadata("design:type", typeof ShellDebugWindow === "undefined" ? Object : ShellDebugWindow)
], ShellMainWindowAttachments.prototype, "debugWindow", void 0);
__decorate([
    inject(ShellErrorPage),
    __metadata("design:type", typeof ShellErrorPage === "undefined" ? Object : ShellErrorPage)
], ShellMainWindowAttachments.prototype, "errorPage", void 0);
__decorate([
    inject(ShellShortcuts),
    __metadata("design:type", typeof ShellShortcuts === "undefined" ? Object : ShellShortcuts)
], ShellMainWindowAttachments.prototype, "shortcuts", void 0);
ShellMainWindowAttachments = __decorate([
    injectable()
], ShellMainWindowAttachments);
