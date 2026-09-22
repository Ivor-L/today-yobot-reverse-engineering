// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/windows/index.ts.
// The original TypeScript and import graph are not restored.






class ShellTrayWindowsMenu {
    async show(params) {
        if (this.operation) {
            return null;
        }
        const operation = {};
        this.operation = operation;
        try {
            this.platform.prepareStatusMenu();
            const actionId = await this.nodeAdapter.cpi.windows.showStatusMenu(params);
            if (operation.dismissal) {
                return null;
            }
            return actionId;
        } finally{
            // An older dismiss RPC must finish before another popup can be requested.
            await operation.dismissal;
            this.operation = undefined;
        }
    }
    close() {
        const operation = this.operation;
        if (!operation || operation.dismissal) {
            return;
        }
        operation.dismissal = this.dismiss();
    }
    async dismiss() {
        try {
            await this.nodeAdapter.cpi.windows.dismissStatusMenu();
        } catch (error) {
            console.error('[desktop] failed to dismiss the native Windows tray menu', error);
        }
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayWindowsMenu.prototype, "nodeAdapter", void 0);
__decorate([
    inject(SelectedDesktopPlatform),
    __metadata("design:type", typeof IDesktopPlatform === "undefined" ? Object : IDesktopPlatform)
], ShellTrayWindowsMenu.prototype, "platform", void 0);
ShellTrayWindowsMenu = __decorate([
    injectable()
], ShellTrayWindowsMenu);
