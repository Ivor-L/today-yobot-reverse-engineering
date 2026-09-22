// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/api-client/index.ts.
// The original TypeScript and import graph are not restored.







class AccountApiClient {
    async create(accessToken) {
        const apiFetch = async (input, init)=>await this.http.request(globalThis.fetch, input, init);
        const headers = await this.http.headers({
            target: 'api'
        });
        return createClient({
            baseUrl: this.config.current.apiBaseUrl,
            auth: accessToken,
            fetch: apiFetch,
            redirect: 'error',
            headers
        });
    }
}
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountApiClient.prototype, "http", void 0);
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountApiClient.prototype, "config", void 0);
AccountApiClient = __decorate([
    injectable()
], AccountApiClient);
