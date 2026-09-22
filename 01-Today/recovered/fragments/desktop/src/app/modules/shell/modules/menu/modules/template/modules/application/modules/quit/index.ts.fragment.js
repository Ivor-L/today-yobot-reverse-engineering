// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/quit/index.ts.
// The original TypeScript and import graph are not restored.





class ShellQuitMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'quit'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.quit', this.priority = 100, this.sectionPriority = (/* inlined export .APPLICATION_QUIT_SECTION_PRIORITY */500);
    }
}
ShellQuitMenuItem = __decorate([
    injectable()
], ShellQuitMenuItem);
