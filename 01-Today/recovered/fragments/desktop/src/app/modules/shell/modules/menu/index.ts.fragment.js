// Compiled fragment from ./src/app/modules/shell/modules/menu/index.ts.
// The original TypeScript and import graph are not restored.






class ShellMenu {
    install() {
        if (this.installed) {
            return;
        }
        const menu = external_electron_.Menu.buildFromTemplate(this.template.create());
        external_electron_.Menu.setApplicationMenu(menu);
        this.installed = true;
    }
    constructor(){
        this.installed = false;
    }
}
__decorate([
    inject(ShellMenuTemplate),
    __metadata("design:type", typeof ShellMenuTemplate === "undefined" ? Object : ShellMenuTemplate)
], ShellMenu.prototype, "template", void 0);
ShellMenu = __decorate([
    injectable()
], ShellMenu);
