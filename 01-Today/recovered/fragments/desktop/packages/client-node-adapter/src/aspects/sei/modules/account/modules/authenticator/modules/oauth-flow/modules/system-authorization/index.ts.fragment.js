// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/oauth-flow/modules/system-authorization/index.ts.
// The original TypeScript and import graph are not restored.









class AccountSystemAuthorization {
    async open(provider, request) {
        if (this.config.current.clientPlatform !== 'macos-client') {
            return null;
        }
        if (!SYSTEM_AUTH_PROVIDERS.has(provider)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, `The ${provider} provider is not available through macOS system authentication.`);
        }
        const openSession = this.cpi.macos?.openWebAuthenticationSession;
        if (typeof openSession !== 'function') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The macOS system authentication session is unavailable.');
        }
        try {
            this.logger.info(ACCOUNT_SYSTEM_AUTHORIZATION_LOG_CATEGORY, `session starting: provider=${provider}`);
            const result = await openSession({
                authorizationUrl: request.authorizationUrl,
                callbackScheme: SYSTEM_AUTH_CALLBACK_SCHEME,
                timeoutMs: request.timeoutMs
            });
            this.logger.info(ACCOUNT_SYSTEM_AUTHORIZATION_LOG_CATEGORY, `session returned: provider=${provider}`);
            return result.callbackUrl;
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The macOS authentication session could not be completed.');
        }
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountSystemAuthorization.prototype, "config", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof AccountCpi === "undefined" ? Object : AccountCpi)
], AccountSystemAuthorization.prototype, "cpi", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], AccountSystemAuthorization.prototype, "logger", void 0);
AccountSystemAuthorization = __decorate([
    injectable()
], AccountSystemAuthorization);
