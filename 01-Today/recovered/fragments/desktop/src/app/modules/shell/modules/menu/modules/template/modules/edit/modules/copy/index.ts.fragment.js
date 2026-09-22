// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/copy/index.ts.
// The original TypeScript and import graph are not restored.





class ShellCopyMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'copy'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.copy', this.platforms = [
            'darwin'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .EDIT_CLIPBOARD_SECTION_PRIORITY */200);
    }
}
ShellCopyMenuItem = __decorate([
    injectable()
], ShellCopyMenuItem);
