// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/tool-permissions/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.









class ShellToolPermissionsIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(TOOL_PERMISSIONS_CLOSE_CHANNEL);
        ipc.removeHandler(TOOL_PERMISSIONS_GET_CHANNEL);
        ipc.removeHandler(TOOL_PERMISSIONS_SET_CHANNEL);
        ipc.removeHandler(TOOL_PERMISSIONS_SET_REJECTION_CODE_CHANNEL);
        ipc.removeHandler(TOOL_PERMISSIONS_SET_MODE_CHANNEL);
        ipc.removeHandler(TOOL_PERMISSIONS_RESET_CHANNEL);
        ipc.handle(TOOL_PERMISSIONS_CLOSE_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            this.window.close();
        });
        ipc.handle(TOOL_PERMISSIONS_GET_CHANNEL, async (event)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.tools.getPermissions();
        });
        ipc.handle(TOOL_PERMISSIONS_SET_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.tools.setPermissions(parseToolPermissionsChange(value));
        });
        ipc.handle(TOOL_PERMISSIONS_SET_REJECTION_CODE_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.tools.setRejectionCode(parseToolPermissionRejectionCode(value));
        });
        ipc.handle(TOOL_PERMISSIONS_SET_MODE_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.tools.setMode(parseToolPermissionsMode(value));
        });
        ipc.handle(TOOL_PERMISSIONS_RESET_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            return await this.adapter.sei.debug.tools.resetPermissions(parseToolPermissionsReset(value));
        });
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted tool permissions IPC sender');
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellToolPermissionsIpc.prototype, "adapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellToolPermissionsIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellToolPermissionsWindow),
    __metadata("design:type", typeof ShellToolPermissionsWindow === "undefined" ? Object : ShellToolPermissionsWindow)
], ShellToolPermissionsIpc.prototype, "window", void 0);
ShellToolPermissionsIpc = __decorate([
    injectable()
], ShellToolPermissionsIpc);
