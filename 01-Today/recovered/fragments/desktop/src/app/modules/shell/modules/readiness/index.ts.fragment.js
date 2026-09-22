// Compiled fragment from ./src/app/modules/shell/modules/readiness/index.ts.
// The original TypeScript and import graph are not restored.








class ShellReadiness {
    prepare() {
        this.preflight.run();
    }
    async whenReady() {
        if (!this.result) {
            this.result = this.initialize();
        }
        await this.result;
    }
    async initialize() {
        const application = this.preflight.application;
        await application.whenReady();
        this.errorPage.install();
        await this.logUpload.install();
        await this.debugPanel.install();
    }
}
__decorate([
    inject(ShellLogUploadPanel),
    __metadata("design:type", typeof ShellLogUploadPanel === "undefined" ? Object : ShellLogUploadPanel)
], ShellReadiness.prototype, "logUpload", void 0);
__decorate([
    inject(ShellDebugPanel),
    __metadata("design:type", typeof ShellDebugPanel === "undefined" ? Object : ShellDebugPanel)
], ShellReadiness.prototype, "debugPanel", void 0);
__decorate([
    inject(ShellErrorPage),
    __metadata("design:type", typeof ShellErrorPage === "undefined" ? Object : ShellErrorPage)
], ShellReadiness.prototype, "errorPage", void 0);
__decorate([
    inject(DesktopPreflight),
    __metadata("design:type", typeof DesktopPreflight === "undefined" ? Object : DesktopPreflight)
], ShellReadiness.prototype, "preflight", void 0);
ShellReadiness = __decorate([
    injectable()
], ShellReadiness);
