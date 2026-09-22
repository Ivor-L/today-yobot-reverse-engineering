// Compiled fragment from ./src/app/modules/shell/modules/user-agent/index.ts.
// The original TypeScript and import graph are not restored.






class ShellUserAgent {
    configure(browserSession, webContents) {
        const userAgent = createDesktopUserAgent(this.configuration.application.getVersion(), process.versions.chrome, this.configuration.platform);
        browserSession.setUserAgent(userAgent);
        webContents.setUserAgent(userAgent);
        return userAgent;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellUserAgent.prototype, "configuration", void 0);
ShellUserAgent = __decorate([
    injectable()
], ShellUserAgent);
