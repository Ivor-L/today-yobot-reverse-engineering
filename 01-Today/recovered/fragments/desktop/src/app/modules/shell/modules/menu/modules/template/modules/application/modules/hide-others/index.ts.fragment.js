// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/hide-others/index.ts.
// The original TypeScript and import graph are not restored.





class ShellHideOthersMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'hideOthers'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.hide-others', this.platforms = [
            'darwin'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .APPLICATION_VISIBILITY_SECTION_PRIORITY */400);
    }
}
ShellHideOthersMenuItem = __decorate([
    injectable()
], ShellHideOthersMenuItem);
