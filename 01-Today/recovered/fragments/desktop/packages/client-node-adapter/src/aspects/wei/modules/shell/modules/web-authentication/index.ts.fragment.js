// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/shell/modules/web-authentication/index.ts.
// The original TypeScript and import graph are not restored.









class ShellWebAuthentication {
    async open(params) {
        const { authorizationUrl, callbackTarget } = params;
        if (!isAllowedWebAuthenticationAuthorizationUrl(authorizationUrl)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'Shell web authentication requires a credential-free HTTPS authorization URL');
        }
        const surface = this.requestContext.surface ?? (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell");
        if (surface !== (/* inlined export .ClientRuntimeSurface.AppShell */"app-shell") && surface !== (/* inlined export .ClientRuntimeSurface.QuickChat */"quick-chat")) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Shell web authentication is only available from a trusted application surface');
        }
        const { platform } = await this.cpi.system.getSystemInfo();
        if (platform !== cpi_SystemPlatform.MacOS) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'System web authentication sessions are only supported on macOS');
        }
        const result = await this.cpi.macos.openWebAuthenticationSession({
            authorizationUrl,
            callbackScheme: WEB_AUTHENTICATION_CALLBACK_SCHEME,
            timeoutMs: (/* inlined export .WEB_AUTHENTICATION_TIMEOUT_MS */600000)
        });
        if (!isExpectedWebAuthenticationCallback(result.callbackUrl, callbackTarget)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The system web authentication session returned an unexpected callback');
        }
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ShellWebAuthentication.prototype, "cpi", void 0);
__decorate([
    inject(CLIENT_NODE_WEB_REQUEST_CONTEXT),
    __metadata("design:type", typeof ClientNodeWebRequestContext === "undefined" ? Object : ClientNodeWebRequestContext)
], ShellWebAuthentication.prototype, "requestContext", void 0);
ShellWebAuthentication = __decorate([
    injectable()
], ShellWebAuthentication);
