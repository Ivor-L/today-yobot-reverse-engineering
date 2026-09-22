// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/context/index.ts.
// The original TypeScript and import graph are not restored.






class ShellMenuContext {
    get applicationName() {
        return this.configuration.application.getName();
    }
    get copy() {
        return resolveMacMenuCopy(this.configuration.application.getLocale());
    }
    get platform() {
        return this.configuration.platform;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellMenuContext.prototype, "configuration", void 0);
ShellMenuContext = __decorate([
    injectable()
], ShellMenuContext);
