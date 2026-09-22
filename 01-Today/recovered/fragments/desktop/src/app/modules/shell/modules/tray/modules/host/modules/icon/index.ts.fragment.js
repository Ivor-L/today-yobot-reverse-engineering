// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/icon/index.ts.
// The original TypeScript and import graph are not restored.









class ShellTrayIcon {
    load() {
        const image = this.loadImage(this.assets.trayIconPath);
        if (this.configuration.platform !== 'darwin') {
            return image;
        }
        image.setTemplateImage(true);
        this.activeImage = image;
        this.dimmedImage = createOpacityVariant(image, (/* inlined export .DIMMED_TRAY_ICON_OPACITY */0.4));
        this.renderedAsOnline = undefined;
        return this.dimmedImage;
    }
    render(tray, online) {
        if (online === this.renderedAsOnline) {
            return;
        }
        let image = this.dimmedImage;
        if (online) {
            image = this.activeImage;
        }
        if (image) {
            tray.setImage(image);
        }
        this.renderedAsOnline = online;
    }
    destroy() {
        this.activeImage = undefined;
        this.dimmedImage = undefined;
        this.renderedAsOnline = undefined;
    }
    loadImage(iconPath) {
        const image = external_electron_.nativeImage.createFromPath(iconPath);
        if (image.isEmpty()) {
            throw new Error(`Tray icon could not be loaded: ${iconPath}`);
        }
        return image;
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellTrayIcon.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayIcon.prototype, "configuration", void 0);
ShellTrayIcon = __decorate([
    injectable()
], ShellTrayIcon);
