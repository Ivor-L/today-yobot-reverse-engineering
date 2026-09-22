// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/host/modules/chrome/index.ts.
// The original TypeScript and import graph are not restored.





class ShellMainWindowChrome {
    apply(window, authentication) {
        if (authentication) {
            this.windowChrome.applyAuthenticationMainWindow(window);
            return;
        }
        this.windowChrome.restoreApplicationMainWindow(window);
    }
}
__decorate([
    inject(ShellWindowChrome),
    __metadata("design:type", typeof ShellWindowChrome === "undefined" ? Object : ShellWindowChrome)
], ShellMainWindowChrome.prototype, "windowChrome", void 0);
ShellMainWindowChrome = __decorate([
    injectable()
], ShellMainWindowChrome);
