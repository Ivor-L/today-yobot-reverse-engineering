// Compiled fragment from ./src/app/modules/shell/modules/error-page/index.ts.
// The original TypeScript and import graph are not restored.








class ShellErrorPage {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(ERROR_PAGE_RESTART_CHANNEL);
        ipc.handle(ERROR_PAGE_RESTART_CHANNEL, (event)=>{
            this.assertTrusted(event);
            const application = this.configuration.application;
            application.relaunch();
            application.quit();
        });
    }
    attach(webContents) {
        this.mainWebContents = webContents;
    }
    detach(webContents) {
        if (this.mainWebContents === webContents) {
            this.mainWebContents = undefined;
        }
    }
    assertTrusted(event) {
        const { sender, senderFrame } = event;
        if (sender !== this.mainWebContents || senderFrame !== sender.mainFrame || !hasExactFileUrl(senderFrame.url, this.assets.errorPagePath)) {
            throw new Error('Rejected untrusted error-page IPC sender');
        }
    }
}
__decorate([
    inject(DesktopAssets),
    __metadata("design:type", typeof DesktopAssets === "undefined" ? Object : DesktopAssets)
], ShellErrorPage.prototype, "assets", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellErrorPage.prototype, "configuration", void 0);
ShellErrorPage = __decorate([
    injectable()
], ShellErrorPage);
