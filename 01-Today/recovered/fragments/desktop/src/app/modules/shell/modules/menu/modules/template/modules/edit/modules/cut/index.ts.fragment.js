// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/cut/index.ts.
// The original TypeScript and import graph are not restored.





class ShellCutMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'cut'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.cut', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .EDIT_CLIPBOARD_SECTION_PRIORITY */200);
    }
}
ShellCutMenuItem = __decorate([
    injectable()
], ShellCutMenuItem);
