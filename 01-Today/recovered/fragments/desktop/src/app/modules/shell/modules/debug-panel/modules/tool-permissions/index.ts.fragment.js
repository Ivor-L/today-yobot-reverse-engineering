// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tool-permissions/index.ts.
// The original TypeScript and import graph are not restored.






class ShellToolPermissionsPanel {
    install() {
        this.ipc.install();
    }
    show() {
        return this.window.show();
    }
}
__decorate([
    inject(ShellToolPermissionsIpc),
    __metadata("design:type", typeof ShellToolPermissionsIpc === "undefined" ? Object : ShellToolPermissionsIpc)
], ShellToolPermissionsPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellToolPermissionsWindow),
    __metadata("design:type", typeof ShellToolPermissionsWindow === "undefined" ? Object : ShellToolPermissionsWindow)
], ShellToolPermissionsPanel.prototype, "window", void 0);
ShellToolPermissionsPanel = __decorate([
    injectable()
], ShellToolPermissionsPanel);
