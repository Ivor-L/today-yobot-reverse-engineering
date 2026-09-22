// Compiled fragment from ./src/app/modules/shell/modules/log-upload/index.ts.
// The original TypeScript and import graph are not restored.







class ShellLogUploadPanel {
    async install() {
        this.ipc.install();
        await this.observer.start();
    }
    async show() {
        await this.window.show();
    }
    async startUpload() {
        await this.observer.startUpload();
    }
    async dispose() {
        await this.observer.stop();
        this.window.close();
    }
}
__decorate([
    inject(ShellLogUploadIpc),
    __metadata("design:type", typeof ShellLogUploadIpc === "undefined" ? Object : ShellLogUploadIpc)
], ShellLogUploadPanel.prototype, "ipc", void 0);
__decorate([
    inject(ShellLogUploadObserver),
    __metadata("design:type", typeof ShellLogUploadObserver === "undefined" ? Object : ShellLogUploadObserver)
], ShellLogUploadPanel.prototype, "observer", void 0);
__decorate([
    inject(ShellLogUploadWindow),
    __metadata("design:type", typeof ShellLogUploadWindow === "undefined" ? Object : ShellLogUploadWindow)
], ShellLogUploadPanel.prototype, "window", void 0);
ShellLogUploadPanel = __decorate([
    injectable()
], ShellLogUploadPanel);
