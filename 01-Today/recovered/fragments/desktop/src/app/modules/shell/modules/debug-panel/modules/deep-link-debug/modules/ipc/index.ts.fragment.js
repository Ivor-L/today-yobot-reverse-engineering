// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/deep-link-debug/modules/ipc/index.ts.
// The original TypeScript and import graph are not restored.










class ShellDeepLinkDebugIpc {
    install() {
        const ipc = this.configuration.ipc;
        ipc.removeHandler(DEEP_LINK_DEBUG_GET_SCHEME_CHANNEL);
        ipc.removeHandler(DEEP_LINK_DEBUG_OPEN_CHANNEL);
        ipc.handle(DEEP_LINK_DEBUG_GET_SCHEME_CHANNEL, (event)=>{
            this.assertTrustedSender(event);
            return this.scheme;
        });
        ipc.handle(DEEP_LINK_DEBUG_OPEN_CHANNEL, async (event, value)=>{
            this.assertTrustedSender(event);
            const url = resolveDeepLinkDebugUrl(value, this.scheme);
            await external_electron_.shell.openExternal(url);
        });
    }
    get scheme() {
        const { buildEnvironment, macosRegion } = this.configuration.current;
        return resolveDesktopDeepLinkScheme(buildEnvironment, macosRegion);
    }
    assertTrustedSender(event) {
        if (this.window.isTrustedSender(event)) {
            return;
        }
        throw new Error('Rejected untrusted Deep Link debug IPC sender');
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellDeepLinkDebugIpc.prototype, "configuration", void 0);
__decorate([
    inject(ShellDeepLinkDebugWindow),
    __metadata("design:type", typeof ShellDeepLinkDebugWindow === "undefined" ? Object : ShellDeepLinkDebugWindow)
], ShellDeepLinkDebugIpc.prototype, "window", void 0);
ShellDeepLinkDebugIpc = __decorate([
    injectable()
], ShellDeepLinkDebugIpc);
