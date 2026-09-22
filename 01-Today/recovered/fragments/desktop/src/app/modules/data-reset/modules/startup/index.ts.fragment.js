// Compiled fragment from ./src/app/modules/data-reset/modules/startup/index.ts.
// The original TypeScript and import graph are not restored.








class DesktopDataResetStartup {
    prepare() {
        if (!this.state.pending) {
            return false;
        }
        this.files.clear();
        this.configuration.markProfileReset();
        return true;
    }
    complete() {
        this.state.complete();
    }
    async clearStagedUpdate() {
        await this.stagedUpdate.clear();
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopDataResetStartup.prototype, "configuration", void 0);
__decorate([
    inject(DesktopDataResetFiles),
    __metadata("design:type", typeof DesktopDataResetFiles === "undefined" ? Object : DesktopDataResetFiles)
], DesktopDataResetStartup.prototype, "files", void 0);
__decorate([
    inject(DesktopDataResetState),
    __metadata("design:type", typeof DesktopDataResetState === "undefined" ? Object : DesktopDataResetState)
], DesktopDataResetStartup.prototype, "state", void 0);
__decorate([
    inject(DesktopDataResetStagedUpdate),
    __metadata("design:type", typeof DesktopDataResetStagedUpdate === "undefined" ? Object : DesktopDataResetStagedUpdate)
], DesktopDataResetStartup.prototype, "stagedUpdate", void 0);
DesktopDataResetStartup = __decorate([
    injectable()
], DesktopDataResetStartup);
