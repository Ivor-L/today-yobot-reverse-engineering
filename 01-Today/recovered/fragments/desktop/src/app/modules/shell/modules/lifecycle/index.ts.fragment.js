// Compiled fragment from ./src/app/modules/shell/modules/lifecycle/index.ts.
// The original TypeScript and import graph are not restored.









class ShellLifecycle {
    async launch() {
        await this.update.launch();
    }
    install() {
        if (this.installed) {
            return;
        }
        const application = this.configuration.application;
        application.on('activate', (_event, hasVisibleWindows)=>{
            // macOS 仅在 Dock/Finder/launcher 的 reopen 时触发；带上可见窗口状态便于区分场景。
            this.surfaces.openMain(hasVisibleWindows ? 'app-activate-visible' : 'app-activate-hidden');
        });
        application.on('window-all-closed', ()=>{
        // The tray owns the application lifetime after the last window closes.
        });
        application.on('before-quit', ()=>{
            this.quitState.begin();
        });
        application.on('will-quit', ()=>{
            this.tray.destroy();
            this.surfaces.destroy();
        });
        this.tray.install();
        this.installed = true;
    }
    quit() {
        this.quitState.begin();
        this.configuration.application.quit();
    }
    constructor(){
        this.installed = false;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellLifecycle.prototype, "configuration", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellLifecycle.prototype, "surfaces", void 0);
__decorate([
    inject(ShellQuitState),
    __metadata("design:type", typeof ShellQuitState === "undefined" ? Object : ShellQuitState)
], ShellLifecycle.prototype, "quitState", void 0);
__decorate([
    inject(ShellTray),
    __metadata("design:type", typeof ShellTray === "undefined" ? Object : ShellTray)
], ShellLifecycle.prototype, "tray", void 0);
__decorate([
    inject(ShellUpdateLifecycle),
    __metadata("design:type", typeof ShellUpdateLifecycle === "undefined" ? Object : ShellUpdateLifecycle)
], ShellLifecycle.prototype, "update", void 0);
ShellLifecycle = __decorate([
    injectable()
], ShellLifecycle);
