// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/base/item/index.ts.
// The original TypeScript and import graph are not restored.



class ShellMenuItem {
    supports(platform) {
        if (!this.platforms) {
            return true;
        }
        return this.platforms.includes(platform);
    }
    constructor(){
        this.platforms = undefined;
    }
}
ShellMenuItem = __decorate([
    injectable()
], ShellMenuItem);
