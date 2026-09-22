// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/reload/index.ts.
// The original TypeScript and import graph are not restored.





class ShellReloadMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'reload'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.reload', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .VIEW_RELOAD_SECTION_PRIORITY */100);
    }
}
ShellReloadMenuItem = __decorate([
    injectable()
], ShellReloadMenuItem);
