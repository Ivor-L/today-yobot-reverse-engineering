// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/index.ts.
// The original TypeScript and import graph are not restored.

/// <reference path="../../../../typings/vars.d.ts" />




















class AccountShellService {
    get currentAccountId() {
        return this.state.getRecord()?.user.id;
    }
    /** Adapter-internal request context; not part of the public Account interfaces. */ async getRequestAcceptLanguage() {
        return await this.requestLanguage.get();
    }
    get runtimeSnapshot() {
        const { apiBaseUrl, clientPlatform, environment, webOrigin } = this.configuration.current;
        return Object.freeze({
            apiBaseUrl,
            clientPlatform,
            environment,
            webOrigin
        });
    }
    classifyWebSessionCookie(params) {
        const { name } = params;
        if (!isAccountCookieName(name)) {
            return 'non-account';
        }
        // Desktop credentials are Node-owned. No renderer Cookie can represent this account.
        return 'non-current-account';
    }
    get currentUserSocketSession() {
        const record = this.state.getRecord();
        if (!record) {
            return null;
        }
        return Object.freeze({
            accessToken: record.accessToken,
            accountId: record.user.id,
            environment: record.environment,
            sessionGeneration: this.state.getGeneration()
        });
    }
    async subscribe(eventName, listener) {
        return await this.state.subscribe(eventName, listener);
    }
    async initialize() {
        await this.initializer.run();
        if (this.backgroundServicesStarted) {
            return;
        }
        this.legacyInventory.start();
        this.clientUpgradePolicy.start();
        this.backgroundServicesStarted = true;
    }
    async signInWithOAuth(params) {
        const { providerId } = params;
        await this.initializer.run();
        await this.login.signIn(()=>this.authenticator.signInWithOAuth(providerId));
    }
    async requestEmailCode(params) {
        if (false) {}
        const { email } = params;
        await this.initializer.run();
        try {
            await this.authenticator.requestEmailCode(email);
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The email verification code could not be requested.');
        }
    }
    async verifyEmailCode(params) {
        if (false) {}
        const { code, email } = params;
        await this.initializer.run();
        await this.login.signIn(()=>this.authenticator.verifyEmailCode(email, code));
    }
    async requestPhoneCode(params) {
        const { phoneNumber } = params;
        await this.initializer.run();
        try {
            await this.authenticator.requestPhoneCode(phoneNumber);
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The phone verification code could not be requested.');
        }
    }
    async verifyPhoneCode(params) {
        const { code, phoneNumber } = params;
        await this.initializer.run();
        await this.login.signIn(()=>this.authenticator.verifyPhoneCode(phoneNumber, code));
    }
    async getAccountSnapshot() {
        return await this.reader.getSnapshotWithoutRefresh();
    }
    async getFreshAccountSnapshot() {
        return await this.reader.getSnapshot();
    }
    async listAccounts() {
        await this.initializer.run();
        return await this.selection.list();
    }
    async switchAccount(params) {
        const { accountId } = params;
        await this.initializer.run();
        await this.selection.switch(accountId);
    }
    async getFreshAuthContext() {
        return await this.reader.getMainAuthContext();
    }
    async getFreshNativeAuthContext() {
        return await this.reader.getAuthContext();
    }
    async getFreshUserSocketAuthContext(options) {
        return await this.reader.getSocketContext(options);
    }
    async createApiClient(accessToken) {
        return await this.apiClient.create(accessToken);
    }
    isCurrentUserSocketAuthContext(identity) {
        const record = this.state.getRecord();
        if (!record || this.state.getGeneration() !== identity.sessionGeneration) {
            return false;
        }
        return record.user.id === identity.accountId && record.environment === identity.environment;
    }
    async invalidateRejectedUserSocketSession(identity) {
        await this.state.mutate(async ()=>{
            if (!this.isCurrentUserSocketAuthContext(identity)) {
                return;
            }
            try {
                await this.transition.runSignOut(false);
            } finally{
                this.tracer.pushAuthFailed({
                    code: base_InterfaceErrorCode.AuthRequired,
                    logout: true,
                    via: 'socket'
                });
            }
        });
    }
    async signOut() {
        await this.initializer.run();
        await this.active.run();
    }
    constructor(){
        this.backgroundServicesStarted = false;
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountShellService.prototype, "state", void 0);
__decorate([
    inject(AccountApiClient),
    __metadata("design:type", typeof AccountApiClient === "undefined" ? Object : AccountApiClient)
], AccountShellService.prototype, "apiClient", void 0);
__decorate([
    inject(AccountRequestLanguage),
    __metadata("design:type", typeof AccountRequestLanguage === "undefined" ? Object : AccountRequestLanguage)
], AccountShellService.prototype, "requestLanguage", void 0);
__decorate([
    inject(DefaultAccountAuthenticator),
    __metadata("design:type", typeof DefaultAccountAuthenticator === "undefined" ? Object : DefaultAccountAuthenticator)
], AccountShellService.prototype, "authenticator", void 0);
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountShellService.prototype, "configuration", void 0);
__decorate([
    inject(AccountInitializer),
    __metadata("design:type", typeof AccountInitializer === "undefined" ? Object : AccountInitializer)
], AccountShellService.prototype, "initializer", void 0);
__decorate([
    inject(AccountLogin),
    __metadata("design:type", typeof AccountLogin === "undefined" ? Object : AccountLogin)
], AccountShellService.prototype, "login", void 0);
__decorate([
    inject(AccountReader),
    __metadata("design:type", typeof AccountReader === "undefined" ? Object : AccountReader)
], AccountShellService.prototype, "reader", void 0);
__decorate([
    inject(AccountSelection),
    __metadata("design:type", typeof AccountSelection === "undefined" ? Object : AccountSelection)
], AccountShellService.prototype, "selection", void 0);
__decorate([
    inject(AccountSessionTransition),
    __metadata("design:type", typeof AccountSessionTransition === "undefined" ? Object : AccountSessionTransition)
], AccountShellService.prototype, "transition", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], AccountShellService.prototype, "tracer", void 0);
__decorate([
    inject(AccountActiveSignOut),
    __metadata("design:type", typeof AccountActiveSignOut === "undefined" ? Object : AccountActiveSignOut)
], AccountShellService.prototype, "active", void 0);
__decorate([
    inject(LegacyFileInventoryCleanup),
    __metadata("design:type", typeof LegacyFileInventoryCleanup === "undefined" ? Object : LegacyFileInventoryCleanup)
], AccountShellService.prototype, "legacyInventory", void 0);
__decorate([
    inject(ClientUpgradePolicySync),
    __metadata("design:type", typeof ClientUpgradePolicySync === "undefined" ? Object : ClientUpgradePolicySync)
], AccountShellService.prototype, "clientUpgradePolicy", void 0);
AccountShellService = __decorate([
    injectable()
], AccountShellService);
