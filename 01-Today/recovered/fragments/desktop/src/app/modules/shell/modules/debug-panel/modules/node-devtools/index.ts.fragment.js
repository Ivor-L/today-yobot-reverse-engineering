// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/node-devtools/index.ts.
// The original TypeScript and import graph are not restored.





class ShellNodeDevTools {
    get available() {
        return true;
    }
    async show() {
        await this.window.show();
    }
}
__decorate([
    inject(ShellNodeDevToolsWindow),
    __metadata("design:type", typeof ShellNodeDevToolsWindow === "undefined" ? Object : ShellNodeDevToolsWindow)
], ShellNodeDevTools.prototype, "window", void 0);
ShellNodeDevTools = __decorate([
    injectable()
], ShellNodeDevTools);
