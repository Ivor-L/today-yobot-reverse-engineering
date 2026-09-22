// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellMainWindow {
    install() {
        return this.account.install();
    }
    async open() {
        if (this.host.activate()) {
            const loadResult = this.loadResult;
            if (loadResult) {
                return await loadResult;
            }
            return true;
        }
        const window = this.host.create(this.account.consume());
        const loadResult = this.navigation.load(window, this.webContext.current.webUrl);
        this.loadResult = loadResult;
        return await loadResult;
    }
    activate() {
        return this.host.activate();
    }
    hide() {
        this.host.hide();
    }
    suppressHiddenApplicationRestore() {
        this.host.suppressHiddenApplicationRestore();
    }
    exitFullScreen(window) {
        this.host.exitFullScreen(window);
    }
    setSize(params) {
        return this.host.setSize(params);
    }
    destroy() {
        this.account.destroy();
    }
}
__decorate([
    inject(ShellMainWindowAccountState),
    __metadata("design:type", typeof ShellMainWindowAccountState === "undefined" ? Object : ShellMainWindowAccountState)
], ShellMainWindow.prototype, "account", void 0);
__decorate([
    inject(ShellMainWindowHost),
    __metadata("design:type", typeof ShellMainWindowHost === "undefined" ? Object : ShellMainWindowHost)
], ShellMainWindow.prototype, "host", void 0);
__decorate([
    inject(ShellMainWindowNavigation),
    __metadata("design:type", typeof ShellMainWindowNavigation === "undefined" ? Object : ShellMainWindowNavigation)
], ShellMainWindow.prototype, "navigation", void 0);
__decorate([
    inject(ShellWebContext),
    __metadata("design:type", typeof ShellWebContext === "undefined" ? Object : ShellWebContext)
], ShellMainWindow.prototype, "webContext", void 0);
ShellMainWindow = __decorate([
    injectable()
], ShellMainWindow);
