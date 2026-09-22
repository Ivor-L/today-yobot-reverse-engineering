// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/modules/identity/index.ts.
// The original TypeScript and import graph are not restored.









class AccountSessionIdentityClient {
    async read(fetcher) {
        const config = this.config.current;
        const response = await this.http.request(fetcher, new URL('/api/auth/get-session', config.authBaseUrl), {
            method: 'GET',
            headers: await this.http.headers({
                includeOrigin: true
            }),
            credentials: 'include',
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response));
        }
        const payload = await this.http.readJson(response);
        let user;
        if (utils_isJsonObject(payload) && utils_isJsonObject(payload['user'])) {
            user = payload['user'];
        }
        let userId;
        if (user) {
            userId = asNonEmptyString(user['id']);
        }
        if (!userId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The web account session was not established.');
        }
        return {
            userId
        };
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountSessionIdentityClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountSessionIdentityClient.prototype, "http", void 0);
AccountSessionIdentityClient = __decorate([
    injectable()
], AccountSessionIdentityClient);
