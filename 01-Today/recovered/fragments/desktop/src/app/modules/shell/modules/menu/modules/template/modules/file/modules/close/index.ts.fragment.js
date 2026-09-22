// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/file/modules/close/index.ts.
// The original TypeScript and import graph are not restored.





class ShellCloseMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'close'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .FILE_MENU_GROUP_ID */"file"), this.id = 'file.close', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .FILE_CLOSE_SECTION_PRIORITY */200);
    }
}
ShellCloseMenuItem = __decorate([
    injectable()
], ShellCloseMenuItem);
