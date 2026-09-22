// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/isolated-session/index.ts.
// The original TypeScript and import graph are not restored.











class AccountIsolatedSessionProvider {
    async create() {
        try {
            const isolatedSession = external_electron_.session.fromPartition(`account-auth:${(0,external_node_crypto_namespaceObject.randomUUID)()}`, {
                cache: false
            });
            configureAccountIsolatedSessionSecurity(isolatedSession);
            this.requestOrigin.configure(isolatedSession);
            return new ElectronAccountIsolatedSession(external_electron_.BrowserWindow, isolatedSession, this.authorizationWindow);
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The isolated account session could not be created.');
        }
    }
}
__decorate([
    inject(AccountAuthorizationWindow),
    __metadata("design:type", typeof AccountAuthorizationWindow === "undefined" ? Object : AccountAuthorizationWindow)
], AccountIsolatedSessionProvider.prototype, "authorizationWindow", void 0);
__decorate([
    inject(AccountIsolatedSessionRequestOrigin),
    __metadata("design:type", typeof AccountIsolatedSessionRequestOrigin === "undefined" ? Object : AccountIsolatedSessionRequestOrigin)
], AccountIsolatedSessionProvider.prototype, "requestOrigin", void 0);
AccountIsolatedSessionProvider = __decorate([
    injectable()
], AccountIsolatedSessionProvider);
