// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/zoom-in/index.ts.
// The original TypeScript and import graph are not restored.





class ShellZoomInMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'zoomIn'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.zoom-in', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 200, this.sectionPriority = (/* inlined export .VIEW_ZOOM_SECTION_PRIORITY */200);
    }
}
ShellZoomInMenuItem = __decorate([
    injectable()
], ShellZoomInMenuItem);
