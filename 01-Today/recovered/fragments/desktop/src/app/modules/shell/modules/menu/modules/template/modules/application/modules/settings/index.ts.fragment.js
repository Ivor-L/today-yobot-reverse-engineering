// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/settings/index.ts.
// The original TypeScript and import graph are not restored.









class ShellSettingsMenuItem extends ShellMenuItem {
    create() {
        return {
            accelerator: 'CommandOrControl+,',
            click: this.openSettings,
            icon: external_electron_.nativeImage.createMenuSymbol('gearshape'),
            label: this.context.copy.settings
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.settings', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .APPLICATION_SETTINGS_SECTION_PRIORITY */200), this.openSettings = ()=>{
            this.surfaces.openSettings();
        };
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellSettingsMenuItem.prototype, "context", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellSettingsMenuItem.prototype, "surfaces", void 0);
ShellSettingsMenuItem = __decorate([
    injectable()
], ShellSettingsMenuItem);
