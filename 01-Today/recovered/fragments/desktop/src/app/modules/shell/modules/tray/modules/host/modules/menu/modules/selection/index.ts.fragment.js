// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/selection/index.ts.
// The original TypeScript and import graph are not restored.







class ShellTrayMenuSelection {
    perform(actionId) {
        switch(actionId){
            case RESET_ALL_DATA_ACTION_ID:
                {
                    this.actions.resetAllData();
                    return;
                }
            case UPLOAD_LOCAL_LOGS_ACTION_ID:
                {
                    this.actions.uploadLocalLogs();
                    return;
                }
            case CHECK_FOR_UPDATES_ACTION_ID:
                {
                    this.actions.checkForUpdates();
                    return;
                }
            case OPEN_DEBUG_PANEL_ACTION_ID:
                {
                    this.actions.openDebugPanel();
                    return;
                }
            case OPEN_MAIN_ACTION_ID:
                {
                    this.actions.openMain();
                    return;
                }
            case OPEN_SETTINGS_ACTION_ID:
                {
                    this.actions.openSettings();
                    return;
                }
            case (/* inlined export .QUIT_ACTION_ID */"quit"):
                {
                    this.actions.quit();
                    return;
                }
            case SELECT_DEVELOPMENT_ENVIRONMENT_ACTION_ID:
                {
                    this.environment.selectDevelopment();
                    return;
                }
            case SELECT_PRODUCTION_ENVIRONMENT_ACTION_ID:
                {
                    this.environment.selectProduction();
                    return;
                }
            case TOGGLE_QUICK_CHAT_ACTION_ID:
                {
                    this.actions.toggleQuickChat();
                }
        }
    }
}
__decorate([
    inject(ShellTrayActions),
    __metadata("design:type", typeof ShellTrayActions === "undefined" ? Object : ShellTrayActions)
], ShellTrayMenuSelection.prototype, "actions", void 0);
__decorate([
    inject(ShellTrayEnvironmentSelection),
    __metadata("design:type", typeof ShellTrayEnvironmentSelection === "undefined" ? Object : ShellTrayEnvironmentSelection)
], ShellTrayMenuSelection.prototype, "environment", void 0);
ShellTrayMenuSelection = __decorate([
    injectable()
], ShellTrayMenuSelection);
