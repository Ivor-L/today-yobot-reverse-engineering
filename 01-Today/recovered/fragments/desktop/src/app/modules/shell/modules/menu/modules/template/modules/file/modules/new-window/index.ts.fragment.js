// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/file/modules/new-window/index.ts.
// The original TypeScript and import graph are not restored.








class ShellNewWindowMenuItem extends ShellMenuItem {
    create() {
        return {
            accelerator: 'CommandOrControl+N',
            click: this.openWindow,
            label: this.context.copy.newWindow
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .FILE_MENU_GROUP_ID */"file"), this.id = 'file.new-window', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .FILE_OPEN_SECTION_PRIORITY */100), this.openWindow = ()=>{
            this.surfaces.openMain('menu-new-window');
        };
    }
}
__decorate([
    inject(ShellMenuContext),
    __metadata("design:type", typeof ShellMenuContext === "undefined" ? Object : ShellMenuContext)
], ShellNewWindowMenuItem.prototype, "context", void 0);
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellNewWindowMenuItem.prototype, "surfaces", void 0);
ShellNewWindowMenuItem = __decorate([
    injectable()
], ShellNewWindowMenuItem);
