// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/index.ts.
// The original TypeScript and import graph are not restored.








class AccountAuthClient {
    async requestEmailCode(email) {
        await this.session.requestEmailCode(email);
    }
    async requestPhoneCode(phoneNumber) {
        await this.session.requestPhoneCode(phoneNumber);
    }
    async exchangeOAuthCode(code, verifier) {
        return await this.oauth.exchangeCode(code, verifier);
    }
    async verifyEmailCode(fetcher, email, code) {
        return await this.session.verifyEmailCode(fetcher, email, code);
    }
    async verifyPhoneCode(fetcher, phoneNumber, code) {
        return await this.session.verifyPhoneCode(fetcher, phoneNumber, code);
    }
    async refreshRecord(record) {
        const refreshed = await this.refreshToken(record, true);
        return {
            accessToken: refreshed.accessToken,
            accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
            refreshCredential: refreshed.refreshCredential
        };
    }
    async refreshToken(token, terminal) {
        if (token.source === 'oauth2') {
            return await this.oauth.refresh(token, terminal);
        }
        if (token.source === 'better-auth-session') {
            return await this.session.refresh(token, terminal);
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The stored account credential source is invalid.');
    }
    async readSessionIdentity(fetcher) {
        return await this.session.readIdentity(fetcher);
    }
    async revokeWebSession(fetcher, bearerSessionToken) {
        await this.session.revoke(fetcher, bearerSessionToken);
    }
    async revokeOAuthCredential(refreshCredential) {
        await this.oauth.revoke(refreshCredential);
    }
}
__decorate([
    inject(AccountOAuthClient),
    __metadata("design:type", typeof AccountOAuthClient === "undefined" ? Object : AccountOAuthClient)
], AccountAuthClient.prototype, "oauth", void 0);
__decorate([
    inject(AccountSessionClient),
    __metadata("design:type", typeof AccountSessionClient === "undefined" ? Object : AccountSessionClient)
], AccountAuthClient.prototype, "session", void 0);
AccountAuthClient = __decorate([
    injectable()
], AccountAuthClient);
