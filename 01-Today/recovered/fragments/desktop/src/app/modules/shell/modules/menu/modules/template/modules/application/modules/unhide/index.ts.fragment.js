// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/unhide/index.ts.
// The original TypeScript and import graph are not restored.





class ShellUnhideMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'unhide'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.unhide', this.platforms = [
            'darwin'
        ], this.priority = 300, this.sectionPriority = (/* inlined export .APPLICATION_VISIBILITY_SECTION_PRIORITY */400);
    }
}
ShellUnhideMenuItem = __decorate([
    injectable()
], ShellUnhideMenuItem);
