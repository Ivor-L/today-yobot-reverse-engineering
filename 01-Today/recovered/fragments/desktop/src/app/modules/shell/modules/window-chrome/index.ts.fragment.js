// Compiled fragment from ./src/app/modules/shell/modules/window-chrome/index.ts.
// The original TypeScript and import graph are not restored.






class ShellWindowChrome {
    prepare() {
        if (this.configuration.platform !== 'darwin') {
            return;
        }
        this.nativeBinding.prepare();
    }
    applyAuthenticationMainWindow(window) {
        if (this.configuration.platform !== 'darwin') {
            return;
        }
        this.nativeBinding.applyAuthenticationMainWindow(window);
    }
    restoreApplicationMainWindow(window) {
        if (this.configuration.platform !== 'darwin') {
            return;
        }
        this.nativeBinding.restoreApplicationMainWindow(window);
    }
    setCursor(window, pointer) {
        if (this.configuration.platform !== 'darwin') {
            return;
        }
        this.nativeBinding.setCursor(window, pointer);
    }
    applyRoundedWindow(window, cornerRadius) {
        if (this.configuration.platform !== 'darwin') {
            return;
        }
        this.nativeBinding.applyRoundedWindow(window, cornerRadius);
    }
    applyRoundedBackdrops(window, backdrops) {
        if (this.configuration.platform !== 'darwin') {
            return false;
        }
        this.nativeBinding.applyRoundedBackdrops(window, backdrops);
        return true;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellWindowChrome.prototype, "configuration", void 0);
__decorate([
    inject(ShellWindowChromeNativeBinding),
    __metadata("design:type", typeof ShellWindowChromeNativeBinding === "undefined" ? Object : ShellWindowChromeNativeBinding)
], ShellWindowChrome.prototype, "nativeBinding", void 0);
ShellWindowChrome = __decorate([
    injectable()
], ShellWindowChrome);
