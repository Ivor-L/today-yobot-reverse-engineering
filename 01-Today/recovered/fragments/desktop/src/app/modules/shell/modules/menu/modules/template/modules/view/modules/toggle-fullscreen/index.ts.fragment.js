// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/view/modules/toggle-fullscreen/index.ts.
// The original TypeScript and import graph are not restored.





class ShellToggleFullscreenMenuItem extends ShellMenuItem {
    create() {
        return {
            role: 'togglefullscreen'
        };
    }
    constructor(...args){
        super(...args), this.groupId = (/* inlined export .VIEW_MENU_GROUP_ID */"view"), this.id = 'view.toggle-fullscreen', this.platforms = [
            'linux',
            'win32'
        ], this.priority = 100, this.sectionPriority = (/* inlined export .VIEW_FULLSCREEN_SECTION_PRIORITY */300);
    }
}
ShellToggleFullscreenMenuItem = __decorate([
    injectable()
], ShellToggleFullscreenMenuItem);
