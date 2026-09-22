// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/application/index.ts.
// The original TypeScript and import graph are not restored.







class ShellApplicationMenuGroup extends ShellMenuGroup {
    create(items) {
        if (items.length === 0) {
            return undefined;
        }
        return {
            label: this.context.applicationName,
            submenu: [
                ...items
            ]
        };
    }
    constructor(...args){
        super(...args), this.id = APPLICATION_MENU_GROUP_ID, this.priority = 100;
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellApplicationMenuGroup.prototype, "context", void 0);
ShellApplicationMenuGroup = __decorate([
    injectable()
], ShellApplicationMenuGroup);
