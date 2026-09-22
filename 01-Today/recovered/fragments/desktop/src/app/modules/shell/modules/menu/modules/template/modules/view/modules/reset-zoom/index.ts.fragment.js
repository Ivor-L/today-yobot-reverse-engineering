// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/reset-zoom/index.ts.
// The original TypeScript and import graph are not restored.





class ShellResetZoomMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'resetZoom'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.reset-zoom', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .VIEW_ZOOM_SECTION_PRIORITY */200);
    }
}
ShellResetZoomMenuItem = __decorate([
    injectable()
], ShellResetZoomMenuItem);
