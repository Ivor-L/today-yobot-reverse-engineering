// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/index.ts.
// The original TypeScript and import graph are not restored.








class AccountHttpClient {
    async headers({ bearerToken, contentType, includeOrigin, target } = {}) {
        return await this.header.build({
            bearerToken,
            contentType,
            includeOrigin,
            target
        });
    }
    async request(fetcher, input, init) {
        return await this.transport.send(fetcher, input, init);
    }
    async readJson(response) {
        return await this.reader.readJson(response);
    }
    async responseError(response, { invalidArgumentOnBadRequest, recognizeRegistrationRestriction, terminalOnInvalidCredential } = {}) {
        return await this.errors.map(response, {
            invalidArgumentOnBadRequest,
            recognizeRegistrationRestriction,
            terminalOnInvalidCredential
        });
    }
}
__decorate([
    inject(AccountHeaders),
    __metadata("design:type", typeof AccountHeaders === "undefined" ? Object : AccountHeaders)
], AccountHttpClient.prototype, "header", void 0);
__decorate([
    inject(AccountRequest),
    __metadata("design:type", typeof AccountRequest === "undefined" ? Object : AccountRequest)
], AccountHttpClient.prototype, "transport", void 0);
__decorate([
    inject(AccountResponseReader),
    __metadata("design:type", typeof AccountResponseReader === "undefined" ? Object : AccountResponseReader)
], AccountHttpClient.prototype, "reader", void 0);
__decorate([
    inject(AccountErrorMapper),
    __metadata("design:type", typeof AccountErrorMapper === "undefined" ? Object : AccountErrorMapper)
], AccountHttpClient.prototype, "errors", void 0);
AccountHttpClient = __decorate([
    injectable()
], AccountHttpClient);
