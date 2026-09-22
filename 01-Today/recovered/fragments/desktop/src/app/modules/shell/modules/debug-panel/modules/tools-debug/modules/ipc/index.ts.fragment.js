// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tools-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.








class ShellToolsDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(TOOLS_DEBUG_CLOSE_CHANNEL);
        ipc.removeHandler(TOOLS_DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL);
        ipc.removeHandler(TOOLS_DEBUG_SUBSCRIBE_CHANNEL);
        ipc.removeHandler(TOOLS_DEBUG_UNSUBSCRIBE_CHANNEL);
        ipc.handle(TOOLS_DEBUG_CLOSE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.close();
        });
        ipc.handle(TOOLS_DEBUG_OPEN_TOOL_PERMISSIONS_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            await this.toolPermissions.show();
        });
        ipc.handle(TOOLS_DEBUG_SUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(true);
        });
        ipc.handle(TOOLS_DEBUG_UNSUBSCRIBE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.setRendererSubscribed(false);
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Tools debug IPC sender');
    }
}
__decorate([
    inject(ShellToolPermissionsPanel),
    __metadata("design:type", typeof ShellToolPermissionsPanel === "undefined" ? Object : ShellToolPermissionsPanel)
], ShellToolsDebugIpc.prototype, "toolPermissions", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellToolsDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellToolsDebugWindow),
    __metadata("design:type", typeof ShellToolsDebugWindow === "undefined" ? Object : ShellToolsDebugWindow)
], ShellToolsDebugIpc.prototype, "window", void 0);
ShellToolsDebugIpc = __decorate([
    injectable()
], ShellToolsDebugIpc);
