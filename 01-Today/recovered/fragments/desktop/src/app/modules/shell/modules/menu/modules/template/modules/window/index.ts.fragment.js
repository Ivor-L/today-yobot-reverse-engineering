// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/window/index.ts.
// The original TypeScript and import graph are not restored.







class ShellWindowMenuGroup extends ShellMenuGroup {
    create(items) {
        if (this.context.platform !== 'darwin') {
            return {
                role: 'windowMenu'
            };
        }
        const copy = this.context.copy;
        return {
            label: copy.window,
            role: 'windowMenu',
            submenu: [
                {
                    label: copy.minimize,
                    role: 'minimize'
                },
                {
                    label: copy.zoom,
                    role: 'zoom'
                },
                {
                    type: 'separator'
                },
                {
                    label: copy.bringAllToFront,
                    role: 'front'
                },
                ...items
            ]
        };
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WINDOW_MENU_GROUP_ID */"window"), this.priority = 500;
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellWindowMenuGroup.prototype, "context", void 0);
ShellWindowMenuGroup = __decorate([
    injectable()
], ShellWindowMenuGroup);
