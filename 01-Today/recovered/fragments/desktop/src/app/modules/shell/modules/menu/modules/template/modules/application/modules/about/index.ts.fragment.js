// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/about/index.ts.
// The original TypeScript and import graph are not restored.





class ShellAboutMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'about'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.about', this.priority = 100, this.sectionPriority = (/* inlined export .APPLICATION_INFORMATION_SECTION_PRIORITY */100);
    }
}
ShellAboutMenuItem = __decorate([
    injectable()
], ShellAboutMenuItem);
