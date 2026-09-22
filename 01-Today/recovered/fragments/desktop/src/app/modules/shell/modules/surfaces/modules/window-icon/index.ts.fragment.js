// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/window-icon/index.ts.
// The original TypeScript and import graph are not restored.






class ShellSurfaceWindowIcon {
    load() {
        if (this.image) {
            return this.image;
        }
        const iconPath = this.assets.iconPath;
        const image = external_electron_.nativeImage.createFromPath(iconPath);
        if (image.isEmpty()) {
            throw new Error(`Application icon could not be loaded: ${iconPath}`);
        }
        this.image = image;
        return image;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellSurfaceWindowIcon.prototype, "assets", void 0);
ShellSurfaceWindowIcon = __decorate([
    injectable()
], ShellSurfaceWindowIcon);
