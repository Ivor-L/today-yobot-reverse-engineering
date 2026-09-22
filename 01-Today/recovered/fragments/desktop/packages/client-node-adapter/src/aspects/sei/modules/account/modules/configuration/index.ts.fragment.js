// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/configuration/index.ts.
// The original TypeScript and import graph are not restored.











class AccountConfig {
    get current() {
        if (!this.value) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The account configuration is not available.');
        }
        return this.value;
    }
    async initialize() {
        if (this.value) {
            return;
        }
        if (this.flight) {
            await this.flight;
            return;
        }
        const flight = this.resolve();
        this.flight = flight;
        try {
            await flight;
        } finally{
            if (this.flight === flight) {
                this.flight = undefined;
            }
        }
    }
    async resolve() {
        const [, systemPlatform] = await Promise.all([
            this.preferences.initialize(),
            this.platform.get()
        ]);
        const environment = this.preferences.environment.value;
        const profile = this.profiles[environment];
        if (!profile) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The current environment does not have an account profile.');
        }
        this.value = resolveAccountAuthenticatorProfile(profile, environment, ACCOUNT_CLIENT_PLATFORMS[systemPlatform]);
    }
}
__decorate([
    inject(ACCOUNT_CONFIG),
    __metadata("design:type", typeof AccountAuthenticatorConfig === "undefined" ? Object : AccountAuthenticatorConfig)
], AccountConfig.prototype, "profiles", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], AccountConfig.prototype, "preferences", void 0);
__decorate([
    inject(AccountPlatform),
    __metadata("design:type", typeof AccountPlatform === "undefined" ? Object : AccountPlatform)
], AccountConfig.prototype, "platform", void 0);
AccountConfig = __decorate([
    injectable()
], AccountConfig);
