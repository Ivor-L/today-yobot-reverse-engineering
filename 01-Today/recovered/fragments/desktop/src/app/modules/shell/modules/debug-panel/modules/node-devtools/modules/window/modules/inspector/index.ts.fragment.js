// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/node-devtools/modules/window/modules/inspector/index.ts.
// The original TypeScript and import graph are not restored.





class ShellNodeInspector {
    open() {
        const activeUrl = (0,external_node_inspector_.url)();
        if (activeUrl) {
            return activeUrl;
        }
        (0,external_node_inspector_.open)(0, NODE_INSPECTOR_HOST, false);
        const openedUrl = (0,external_node_inspector_.url)();
        if (openedUrl) {
            this.ownedUrl = openedUrl;
            return openedUrl;
        }
        (0,external_node_inspector_.close)();
        throw new Error('Electron Node inspector did not publish a debugger URL');
    }
    close() {
        const ownedUrl = this.ownedUrl;
        this.ownedUrl = undefined;
        if (!ownedUrl || (0,external_node_inspector_.url)() !== ownedUrl) {
            return;
        }
        (0,external_node_inspector_.close)();
    }
}
ShellNodeInspector = __decorate([
    injectable()
], ShellNodeInspector);
