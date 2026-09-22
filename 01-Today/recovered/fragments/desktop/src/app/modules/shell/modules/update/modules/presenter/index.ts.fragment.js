// Compiled fragment from ./src/app/modules/shell/modules/update/modules/presenter/index.ts.
// The original TypeScript and import graph are not restored.









class ShellManualUpdatePresenter {
    presentUpdateInMainWindow() {
        this.requestPresentation();
        this.surfaces.openMain('update-presenter');
    }
    async presentManualUpdateResult(state, checkCompleted) {
        const copy = this.context.copy;
        if (checkCompleted && state.status === (/* inlined export .UpdateStatus.UpToDate */"up-to-date")) {
            await external_electron_.dialog.showMessageBox({
                buttons: [
                    copy.ok
                ],
                defaultId: 0,
                detail: copy.latestVersionDetail(state.currentVersion.version, state.currentVersion.build),
                message: copy.upToDate,
                noLink: true,
                type: 'info'
            });
            return;
        }
        if (state.status === (/* inlined export .UpdateStatus.Unsupported */"unsupported")) {
            await external_electron_.dialog.showMessageBox({
                buttons: [
                    copy.ok
                ],
                defaultId: 0,
                detail: copy.updatesUnavailableDetail,
                message: copy.updatesUnavailable,
                noLink: true,
                type: 'info'
            });
        }
    }
    async requestPresentation() {
        try {
            await this.nodeAdapter.sei.update.requestPresentation();
        } catch  {
        // Presentation requests are best effort; opening the main surface still succeeds.
        }
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellManualUpdatePresenter.prototype, "nodeAdapter", void 0);
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellManualUpdatePresenter.prototype, "context", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellManualUpdatePresenter.prototype, "surfaces", void 0);
ShellManualUpdatePresenter = __decorate([
    injectable()
], ShellManualUpdatePresenter);
