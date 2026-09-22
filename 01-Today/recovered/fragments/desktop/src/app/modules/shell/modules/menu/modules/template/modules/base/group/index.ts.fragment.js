// Compiled fragment from ./src/app/modules/shell/modules/menu/modules/template/modules/base/group/index.ts.
// The original TypeScript and import graph are not restored.



class ShellMenuGroup {
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
ShellMenuGroup = __decorate([
    injectable()
], ShellMenuGroup);
