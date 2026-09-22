// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/index.ts.
// The original TypeScript and import graph are not restored.





class ShellViewMenuGroup extends ShellMenuGroup {
    create(items) {
        if (items.length === 0) {
            return undefined;
        }
        return {
            label: 'View',
            submenu: [
                ...items
            ]
        };
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.platforms = [
            'linux',
            'win32'
        ], this.priority = 400;
    }
}
ShellViewMenuGroup = __decorate([
    injectable()
], ShellViewMenuGroup);
