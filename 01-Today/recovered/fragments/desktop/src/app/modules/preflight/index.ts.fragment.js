// Compiled fragment from ./src/app/modules/preflight/index.ts.
// The original TypeScript and import graph are not restored.






class DesktopPreflight {
    get application() {
        return this.configuration.application;
    }
    get iconPath() {
        return this.assets.iconPath;
    }
    run() {
        if (this.completed) {
            return;
        }
        this.configuration.prepare();
        this.assets.assertRequiredFiles();
        this.completed = true;
    }
    constructor(){
        this.completed = false;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], DesktopPreflight.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopPreflight.prototype, "configuration", void 0);
DesktopPreflight = __decorate([
    injectable()
], DesktopPreflight);
