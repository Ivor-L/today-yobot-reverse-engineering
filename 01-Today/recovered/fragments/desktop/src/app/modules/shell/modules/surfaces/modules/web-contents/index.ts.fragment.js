// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/web-contents/index.ts.
// The original TypeScript and import graph are not restored.









class ShellSurfaceWebContents {
    attach(window, surface) {
        this.security.configure(window);
        this.requestHeaders.configure(external_electron_.session.defaultSession);
        this.userAgent.configure(external_electron_.session.defaultSession, window.webContents);
        this.trust.attach(window.webContents, surface);
    }
    detach(webContents) {
        this.trust.detach(webContents);
    }
}
__decorate([
    inject(ShellRequestHeaders),
    __metadata("design:type", typeof ShellRequestHeaders === "undefined" ? Object : ShellRequestHeaders)
], ShellSurfaceWebContents.prototype, "requestHeaders", void 0);
__decorate([
    inject(ShellSecurity),
    __metadata("design:type", typeof ShellSecurity === "undefined" ? Object : ShellSecurity)
], ShellSurfaceWebContents.prototype, "security", void 0);
__decorate([
    inject(ShellWebContentsTrust),
    __metadata("design:type", typeof ShellWebContentsTrust === "undefined" ? Object : ShellWebContentsTrust)
], ShellSurfaceWebContents.prototype, "trust", void 0);
__decorate([
    inject(ShellUserAgent),
    __metadata("design:type", typeof ShellUserAgent === "undefined" ? Object : ShellUserAgent)
], ShellSurfaceWebContents.prototype, "userAgent", void 0);
ShellSurfaceWebContents = __decorate([
    injectable()
], ShellSurfaceWebContents);
