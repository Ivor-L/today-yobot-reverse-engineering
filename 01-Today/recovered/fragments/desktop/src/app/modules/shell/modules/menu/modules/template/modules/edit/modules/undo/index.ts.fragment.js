// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/modules/undo/index.ts.
// The original TypeScript and import graph are not restored.





class ShellUndoMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'undo'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.id = 'edit.undo', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .EDIT_HISTORY_SECTION_PRIORITY */100);
    }
}
ShellUndoMenuItem = __decorate([
    injectable()
], ShellUndoMenuItem);
