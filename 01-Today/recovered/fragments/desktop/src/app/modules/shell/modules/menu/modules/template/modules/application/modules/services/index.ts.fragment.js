// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/modules/services/index.ts.
// The original TypeScript and import graph are not restored.





class ShellServicesMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'services'
        };
    }
    constructor(...args){
        super(...args), this.groupId = APPLICATION_MENU_GROUP_ID, this.id = 'application.services', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .APPLICATION_SERVICES_SECTION_PRIORITY */300);
    }
}
ShellServicesMenuItem = __decorate([
    injectable()
], ShellServicesMenuItem);
