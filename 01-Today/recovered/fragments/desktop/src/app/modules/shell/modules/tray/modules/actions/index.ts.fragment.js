// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/actions/index.ts.
// The original TypeScript and import graph are not restored.












class ShellTrayActions {
    constructor(){
        this.openMain = ()=>{
            this.surfaces.openMain('tray');
        };
        this.openSettings = ()=>{
            this.surfaces.openSettings();
        };
        this.openDebugPanel = ()=>{
            this.debugPanel.show();
        };
        this.resetAllData = ()=>{
            this.dataReset.requestReset();
        };
        this.uploadLocalLogs = async ()=>{
            try {
                await this.logUpload.startUpload();
            } catch  {
                console.error('[desktop] unable to open the log upload window');
            }
        };
        this.checkForUpdates = ()=>{
            this.manualUpdateCheck.run();
        };
        this.toggleQuickChat = ()=>{
            if (!this.state.current.authenticated) {
                return;
            }
            this.surfaces.toggleQuickChat();
        };
        this.quit = ()=>{
            this.quitState.begin();
            this.configuration.application.quit();
        };
    }
}
__decorate([
    inject(DesktopDataReset),
    __metadata("design:type", typeof DesktopDataReset === "undefined" ? Object : DesktopDataReset)
], ShellTrayActions.prototype, "dataReset", void 0);
__decorate([
    inject(ShellLogUploadPanel),
    __metadata("design:type", typeof ShellLogUploadPanel === "undefined" ? Object : ShellLogUploadPanel)
], ShellTrayActions.prototype, "logUpload", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellTrayActions.prototype, "configuration", void 0);
__decorate([
    inject(ShellDebugPanel),
    __metadata("design:type", typeof ShellDebugPanel === "undefined" ? Object : ShellDebugPanel)
], ShellTrayActions.prototype, "debugPanel", void 0);
__decorate([
    inject(ShellQuitState),
    __metadata("design:type", typeof ShellQuitState === "undefined" ? Object : ShellQuitState)
], ShellTrayActions.prototype, "quitState", void 0);
__decorate([
    inject(ShellManualUpdateCheck),
    __metadata("design:type", typeof ShellManualUpdateCheck === "undefined" ? Object : ShellManualUpdateCheck)
], ShellTrayActions.prototype, "manualUpdateCheck", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellTrayActions.prototype, "surfaces", void 0);
__decorate([
    inject(ShellTrayState),
    __metadata("design:type", typeof ShellTrayState === "undefined" ? Object : ShellTrayState)
], ShellTrayActions.prototype, "state", void 0);
ShellTrayActions = __decorate([
    injectable()
], ShellTrayActions);
