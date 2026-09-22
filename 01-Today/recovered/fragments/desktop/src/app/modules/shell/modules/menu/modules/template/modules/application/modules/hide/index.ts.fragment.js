// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/hide/index.ts.
// The original TypeScript and import graph are not restored.





class ShellHideMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'hide'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.hide', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .APPLICATION_VISIBILITY_SECTION_PRIORITY */400);
    }
}
ShellHideMenuItem = __decorate([
    injectable()
], ShellHideMenuItem);
