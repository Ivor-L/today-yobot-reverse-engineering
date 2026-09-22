// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/window/modules/exit-fullscreen/index.ts.
// The original TypeScript and import graph are not restored.







class ShellExitFullscreenMenuItem extends ShellMenuItem {
    create() {
        return {
            accelerator: 'Control+Command+F',
            acceleratorWorksWhenHidden: true,
            click: this.exitFullScreen,
            label: 'Exit Full Screen',
            visible: false
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .WINDOW_MENU_GROUP_ID */"window"), this.id = 'window.exit-fullscreen', this.platforms = [
            'darwin'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .WINDOW_FULLSCREEN_SECTION_PRIORITY */100), this.exitFullScreen = (_item, window)=>{
            this.surfaces.exitMainFullScreen(window);
        };
    }
}
__decorate([
    inject(ShellSurfaces),
    __metadata("design:type", typeof ShellSurfaces === "undefined" ? Object : ShellSurfaces)
], ShellExitFullscreenMenuItem.prototype, "surfaces", void 0);
ShellExitFullscreenMenuItem = __decorate([
    injectable()
], ShellExitFullscreenMenuItem);
