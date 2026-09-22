// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/paste/index.ts.
// The original TypeScript and import graph are not restored.





class ShellPasteMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'paste'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.paste', this.platforms = [
            'darwin'
        ], this.priority = 300, this.sectionPriority = (/* inlined export .EDIT_CLIPBOARD_SECTION_PRIORITY */200);
    }
}
ShellPasteMenuItem = __decorate([
    injectable()
], ShellPasteMenuItem);
