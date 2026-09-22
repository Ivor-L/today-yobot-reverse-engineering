// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/select-all/index.ts.
// The original TypeScript and import graph are not restored.





class ShellSelectAllMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'selectAll'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.select-all', this.platforms = [
            'darwin'
        ], this.priority = 400, this.sectionPriority = (/* inlined export .EDIT_CLIPBOARD_SECTION_PRIORITY */200);
    }
}
ShellSelectAllMenuItem = __decorate([
    injectable()
], ShellSelectAllMenuItem);
