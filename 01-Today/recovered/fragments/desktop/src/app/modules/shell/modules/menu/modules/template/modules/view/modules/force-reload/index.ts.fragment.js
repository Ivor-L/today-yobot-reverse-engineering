// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/force-reload/index.ts.
// The original TypeScript and import graph are not restored.





class ShellForceReloadMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'forceReload'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.force-reload', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .VIEW_RELOAD_SECTION_PRIORITY */100);
    }
}
ShellForceReloadMenuItem = __decorate([
    injectable()
], ShellForceReloadMenuItem);
