// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/modules/revocation/index.ts.
// The original TypeScript and import graph are not restored.







class AccountSessionRevocationClient {
    async revoke(fetcher, bearerSessionToken) {
        const headerOptions = {
            contentType: 'application/json',
            includeOrigin: true
        };
        let headers = await this.http.headers(headerOptions);
        let credentials = 'include';
        if (bearerSessionToken) {
            credentials = 'omit';
            headers = await this.http.headers({
                ...headerOptions,
                bearerToken: bearerSessionToken
            });
        }
        const config = this.config.current;
        const response = await this.http.request(fetcher, new URL('/api/auth/sign-out', config.authBaseUrl), {
            method: 'POST',
            headers,
            body: '{}',
            credentials,
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response));
        }
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountSessionRevocationClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountSessionRevocationClient.prototype, "http", void 0);
AccountSessionRevocationClient = __decorate([
    injectable()
], AccountSessionRevocationClient);
