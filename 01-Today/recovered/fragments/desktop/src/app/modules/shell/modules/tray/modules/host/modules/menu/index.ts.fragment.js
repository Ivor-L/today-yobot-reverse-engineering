// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/index.ts.
// The original TypeScript and import graph are not restored.













class ShellTrayMenu {
    createBasic() {
        return external_electron_.Menu.buildFromTemplate(this.template.createBasic());
    }
    start() {
        if (this.active) {
            return;
        }
        this.active = true;
        this.generation += 1;
        this.shortcut.start();
    }
    update(snapshot) {
        this.online = snapshot.online;
        if (this.authenticated !== snapshot.authenticated) {
            this.authenticated = snapshot.authenticated;
            this.generation += 1;
            this.windowsMenu.close();
        }
    }
    show(tray) {
        if (!this.active) {
            return;
        }
        if (this.configuration.platform === 'win32') {
            this.showWindowsMenu(tray, this.generation);
            return;
        }
        if (!this.state.current.authenticated && this.configuration.current.buildEnvironment === base_RuntimeEnvironment.Production) {
            return;
        }
        if (this.showing) {
            return;
        }
        this.showNativeMenu(tray, this.generation);
    }
    destroy() {
        this.active = false;
        this.generation += 1;
        this.windowsMenu.close();
        this.shortcut.destroy();
    }
    async showWindowsMenu(tray, generation) {
        try {
            const snapshot = this.createSnapshot();
            const actionId = await this.windowsMenu.show({
                // Only Electron knows the mapping of its mixed-DPI desktop coordinates.
                sourceFrame: external_electron_.screen.dipToScreenRect(null, tray.getBounds()),
                ...snapshot
            });
            if (actionId && this.active && this.generation === generation) {
                this.selection.perform(actionId);
            }
        } catch (error) {
            console.error('[desktop] failed to show the native Windows tray menu', error);
        }
    }
    async showNativeMenu(tray, generation) {
        this.showing = true;
        try {
            const snapshot = this.createSnapshot();
            const actionId = await this.nodeAdapter.cpi.macos.showStatusMenu({
                sourceFrame: tray.getBounds(),
                ...snapshot
            });
            if (actionId && this.active && this.generation === generation) {
                this.selection.perform(actionId);
            }
        } catch (error) {
            console.error('[desktop] failed to show the native macOS status menu', error);
        } finally{
            this.showing = false;
        }
    }
    createSnapshot() {
        if (this.state.current.authenticated) {
            return this.template.createStatus({
                online: this.online,
                quickChatShortcut: this.shortcut.current
            });
        }
        return this.template.createSignedOutStatus();
    }
    constructor(){
        this.active = false;
        this.authenticated = false;
        this.generation = 0;
        this.online = false;
        this.showing = false;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayMenu.prototype, "configuration", void 0);
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayMenu.prototype, "nodeAdapter", void 0);
__decorate([
    inject(ShellTrayState),
    __metadata("design:type", typeof ShellTrayState === "undefined" ? Object : ShellTrayState)
], ShellTrayMenu.prototype, "state", void 0);
__decorate([
    inject(ShellTrayMenuSelection),
    __metadata("design:type", typeof ShellTrayMenuSelection === "undefined" ? Object : ShellTrayMenuSelection)
], ShellTrayMenu.prototype, "selection", void 0);
__decorate([
    inject(ShellTrayShortcut),
    __metadata("design:type", typeof ShellTrayShortcut === "undefined" ? Object : ShellTrayShortcut)
], ShellTrayMenu.prototype, "shortcut", void 0);
__decorate([
    inject(ShellTrayMenuTemplate),
    __metadata("design:type", typeof ShellTrayMenuTemplate === "undefined" ? Object : ShellTrayMenuTemplate)
], ShellTrayMenu.prototype, "template", void 0);
__decorate([
    inject(ShellTrayWindowsMenu),
    __metadata("design:type", typeof ShellTrayWindowsMenu === "undefined" ? Object : ShellTrayWindowsMenu)
], ShellTrayMenu.prototype, "windowsMenu", void 0);
ShellTrayMenu = __decorate([
    injectable()
], ShellTrayMenu);
