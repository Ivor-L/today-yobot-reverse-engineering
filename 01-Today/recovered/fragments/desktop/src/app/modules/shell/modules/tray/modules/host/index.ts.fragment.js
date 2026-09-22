// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/index.ts.
// The original TypeScript and import graph are not restored.










class ShellTrayHost {
    get requiresStatePreparation() {
        return this.configuration.platform === 'darwin' || this.configuration.platform === 'win32';
    }
    install() {
        if (this.tray) {
            return;
        }
        const platform = this.configuration.platform;
        const trayImage = this.icon.load();
        const basicContextMenu = this.requiresStatePreparation ? undefined : this.menu.createBasic();
        const tray = new external_electron_.Tray(trayImage);
        this.tray = tray;
        tray.setToolTip('Today');
        if (platform === 'linux' && basicContextMenu) {
            tray.setContextMenu(basicContextMenu);
        }
        if (platform === 'darwin') {
            tray.setContextMenu(null);
        }
        tray.on('click', this.handleClick);
        if (platform === 'win32') {
            tray.on('double-click', this.handleClick);
        }
        tray.on('right-click', ()=>{
            if (platform === 'darwin' || platform === 'win32') {
                this.menu.show(tray);
                return;
            }
            if (basicContextMenu) {
                tray.popUpContextMenu(basicContextMenu);
            }
        });
        if (this.requiresStatePreparation) {
            this.state.start(this.render);
            this.menu.start();
        }
    }
    destroy() {
        const tray = this.tray;
        this.tray = undefined;
        this.menu.destroy();
        tray?.destroy();
        this.icon.destroy();
    }
    constructor(){
        this.handleClick = ()=>{
            this.actions.openMain();
        };
        this.render = (snapshot)=>{
            const tray = this.tray;
            if (!tray) {
                return;
            }
            this.menu.update(snapshot);
            this.icon.render(tray, snapshot.online);
        };
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayHost.prototype, "configuration", void 0);
__decorate([
    inject(ShellTrayActions),
    __metadata("design:type", typeof ShellTrayActions === "undefined" ? Object : ShellTrayActions)
], ShellTrayHost.prototype, "actions", void 0);
__decorate([
    inject(ShellTrayIcon),
    __metadata("design:type", typeof ShellTrayIcon === "undefined" ? Object : ShellTrayIcon)
], ShellTrayHost.prototype, "icon", void 0);
__decorate([
    inject(ShellTrayMenu),
    __metadata("design:type", typeof ShellTrayMenu === "undefined" ? Object : ShellTrayMenu)
], ShellTrayHost.prototype, "menu", void 0);
__decorate([
    inject(ShellTrayState),
    __metadata("design:type", typeof ShellTrayState === "undefined" ? Object : ShellTrayState)
], ShellTrayHost.prototype, "state", void 0);
ShellTrayHost = __decorate([
    injectable()
], ShellTrayHost);
