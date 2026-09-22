// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/file/index.ts.
// The original TypeScript and import graph are not restored.







class ShellFileMenuGroup extends ShellMenuGroup {
    create(items) {
        if (this.context.platform !== 'darwin') {
            return {
                role: 'fileMenu'
            };
        }
        if (items.length === 0) {
            return undefined;
        }
        return {
            label: this.context.copy.file,
            submenu: [
                ...items
            ]
        };
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .FILE_MENU_GROUP_ID */"file"), this.priority = 200;
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellFileMenuGroup.prototype, "context", void 0);
ShellFileMenuGroup = __decorate([
    injectable()
], ShellFileMenuGroup);
