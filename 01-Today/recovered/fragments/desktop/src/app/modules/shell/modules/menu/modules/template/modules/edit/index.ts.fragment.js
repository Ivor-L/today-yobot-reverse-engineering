// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/edit/index.ts.
// The original TypeScript and import graph are not restored.







class ShellEditMenuGroup extends ShellMenuGroup {
    create(items) {
        if (this.context.platform !== 'darwin') {
            return {
                role: 'editMenu'
            };
        }
        if (items.length === 0) {
            return undefined;
        }
        return {
            label: this.context.copy.edit,
            submenu: [
                ...items
            ]
        };
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .EDIT_MENU_GROUP_ID */"edit"), this.priority = 300;
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellEditMenuGroup.prototype, "context", void 0);
ShellEditMenuGroup = __decorate([
    injectable()
], ShellEditMenuGroup);
