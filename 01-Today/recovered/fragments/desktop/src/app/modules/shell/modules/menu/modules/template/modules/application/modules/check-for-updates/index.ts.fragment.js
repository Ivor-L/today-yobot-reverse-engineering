// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/check-for-updates/index.ts.
// The original TypeScript and import graph are not restored.








class ShellCheckForUpdatesMenuItem extends ShellMenuItem {
    create() {
        return {
            click: this.checkForUpdates,
            label: this.context.copy.checkForUpdates
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.check-for-updates', this.platforms = [
            'darwin'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .APPLICATION_INFORMATION_SECTION_PRIORITY */100), this.checkForUpdates = ()=>{
            this.manualUpdateCheck.run();
        };
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellCheckForUpdatesMenuItem.prototype, "context", void 0);
__decorate([
    inject(ShellManualUpdateCheck),
    __metadata("design:type", typeof ShellManualUpdateCheck === "undefined" ? Object : ShellManualUpdateCheck)
], ShellCheckForUpdatesMenuItem.prototype, "manualUpdateCheck", void 0);
ShellCheckForUpdatesMenuItem = __decorate([
    injectable()
], ShellCheckForUpdatesMenuItem);
