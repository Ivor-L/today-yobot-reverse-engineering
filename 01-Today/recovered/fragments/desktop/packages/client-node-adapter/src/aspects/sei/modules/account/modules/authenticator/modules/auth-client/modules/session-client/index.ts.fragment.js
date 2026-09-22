// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/index.ts.
// The original TypeScript and import graph are not restored.









class AccountSessionClient {
    async requestEmailCode(email) {
        await this.otp.requestCode(email);
    }
    async verifyEmailCode(fetcher, email, code) {
        return await this.otp.verifyCode(fetcher, email, code);
    }
    async requestPhoneCode(phoneNumber) {
        await this.phoneOtp.requestCode(phoneNumber);
    }
    async verifyPhoneCode(fetcher, phoneNumber, code) {
        return await this.phoneOtp.verifyCode(fetcher, phoneNumber, code);
    }
    async refresh(token, terminal) {
        return await this.token.refresh(token, terminal);
    }
    async readIdentity(fetcher) {
        return await this.identity.read(fetcher);
    }
    async revoke(fetcher, bearerSessionToken) {
        await this.revocation.revoke(fetcher, bearerSessionToken);
    }
}
__decorate([
    inject(AccountEmailOtpClient),
    __metadata("design:type", typeof AccountEmailOtpClient === "undefined" ? Object : AccountEmailOtpClient)
], AccountSessionClient.prototype, "otp", void 0);
__decorate([
    inject(AccountPhoneOtpClient),
    __metadata("design:type", typeof AccountPhoneOtpClient === "undefined" ? Object : AccountPhoneOtpClient)
], AccountSessionClient.prototype, "phoneOtp", void 0);
__decorate([
    inject(AccountSessionTokenClient),
    __metadata("design:type", typeof AccountSessionTokenClient === "undefined" ? Object : AccountSessionTokenClient)
], AccountSessionClient.prototype, "token", void 0);
__decorate([
    inject(AccountSessionIdentityClient),
    __metadata("design:type", typeof AccountSessionIdentityClient === "undefined" ? Object : AccountSessionIdentityClient)
], AccountSessionClient.prototype, "identity", void 0);
__decorate([
    inject(AccountSessionRevocationClient),
    __metadata("design:type", typeof AccountSessionRevocationClient === "undefined" ? Object : AccountSessionRevocationClient)
], AccountSessionClient.prototype, "revocation", void 0);
AccountSessionClient = __decorate([
    injectable()
], AccountSessionClient);
