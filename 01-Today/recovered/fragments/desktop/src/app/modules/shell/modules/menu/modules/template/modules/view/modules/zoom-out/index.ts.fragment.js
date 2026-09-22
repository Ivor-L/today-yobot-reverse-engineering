// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/zoom-out/index.ts.
// The original TypeScript and import graph are not restored.





class ShellZoomOutMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'zoomOut'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.zoom-out', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 300, this.sectionPriority = (/* inlined export .VIEW_ZOOM_SECTION_PRIORITY */200);
    }
}
ShellZoomOutMenuItem = __decorate([
    injectable()
], ShellZoomOutMenuItem);
