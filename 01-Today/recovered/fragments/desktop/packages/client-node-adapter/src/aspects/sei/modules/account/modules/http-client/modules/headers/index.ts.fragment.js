// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/modules/headers/index.ts.
// The original TypeScript and import graph are not restored.








class AccountHeaders {
    async build(options = {}) {
        const { bearerToken, contentType, includeOrigin, target } = options;
        const config = this.config.current;
        const { clientPlatform: configuredClientPlatform, webOrigin } = config;
        const version = await this.version.get();
        const trafficLane = this.preferences.trafficLane.value;
        let clientPlatform = configuredClientPlatform;
        if (target !== 'api') {
            clientPlatform = AUTH_SERVICE_CLIENT_PLATFORMS[configuredClientPlatform];
        }
        const headers = new Headers({
            Accept: 'application/json',
            'X-App-Version': version,
            'X-Client-Platform': clientPlatform
        });
        if (trafficLane) {
            headers.set('X-Traffic-Lane', trafficLane);
        }
        if (includeOrigin) {
            headers.set('Origin', webOrigin);
        }
        if (contentType) {
            headers.set('Content-Type', contentType);
        }
        if (bearerToken) {
            headers.set('Authorization', `Bearer ${bearerToken}`);
        }
        return headers;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountHeaders.prototype, "config", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], AccountHeaders.prototype, "preferences", void 0);
__decorate([
    inject(AccountAppVersion),
    __metadata("design:type", typeof AccountAppVersion === "undefined" ? Object : AccountAppVersion)
], AccountHeaders.prototype, "version", void 0);
AccountHeaders = __decorate([
    injectable()
], AccountHeaders);
