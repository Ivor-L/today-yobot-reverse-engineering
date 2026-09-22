// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/redo/index.ts.
// The original TypeScript and import graph are not restored.





class ShellRedoMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'redo'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.redo', this.platforms = [
            'darwin'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .EDIT_HISTORY_SECTION_PRIORITY */100);
    }
}
ShellRedoMenuItem = __decorate([
    injectable()
], ShellRedoMenuItem);
