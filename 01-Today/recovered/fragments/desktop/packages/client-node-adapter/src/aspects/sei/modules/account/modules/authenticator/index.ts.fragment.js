// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/index.ts.
// The original TypeScript and import graph are not restored.











class DefaultAccountAuthenticator {
    normalizeProvider(providerId) {
        const provider = providerId.trim();
        if (!isAccountOAuthProviderId(provider)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The OAuth provider is not supported.');
        }
        return provider;
    }
    constructor(){
        this.signInWithOAuth = async (providerId)=>{
            try {
                const provider = this.normalizeProvider(providerId);
                return await this.oauth.signIn(provider);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The OAuth account sign-in could not be completed.');
            }
        };
        this.requestEmailCode = async (email)=>{
            try {
                await this.auth.requestEmailCode(normalizeEmail(email));
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The email verification code could not be requested.');
            }
        };
        this.verifyEmailCode = async (email, code)=>{
            try {
                const normalizedEmail = normalizeEmail(email);
                const normalizedCode = normalizeEmailCode(code);
                return await this.candidate.verifyEmailCode(normalizedEmail, normalizedCode);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The email account sign-in could not be completed.');
            }
        };
        this.requestPhoneCode = async (phoneNumber)=>{
            try {
                await this.auth.requestPhoneCode(normalizePhoneNumber(phoneNumber));
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The phone verification code could not be requested.');
            }
        };
        this.verifyPhoneCode = async (phoneNumber, code)=>{
            try {
                const normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
                const normalizedCode = normalizeEmailCode(code);
                return await this.candidate.verifyPhoneCode(normalizedPhoneNumber, normalizedCode);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The phone account sign-in could not be completed.');
            }
        };
        this.refresh = async (record)=>{
            try {
                return await this.auth.refreshRecord(record);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The account session could not be refreshed.');
            }
        };
        this.revoke = async (record)=>{
            try {
                await this.revocation.revoke(record);
            } catch (error) {
                throw interface_error_InterfaceError(error, 'The account session could not be revoked.');
            }
        };
    }
}
__decorate([
    inject(AccountAuthClient),
    __metadata("design:type", typeof AccountAuthClient === "undefined" ? Object : AccountAuthClient)
], DefaultAccountAuthenticator.prototype, "auth", void 0);
__decorate([
    inject(AccountCandidateFlow),
    __metadata("design:type", typeof AccountCandidateFlow === "undefined" ? Object : AccountCandidateFlow)
], DefaultAccountAuthenticator.prototype, "candidate", void 0);
__decorate([
    inject(AccountOAuthFlow),
    __metadata("design:type", typeof AccountOAuthFlow === "undefined" ? Object : AccountOAuthFlow)
], DefaultAccountAuthenticator.prototype, "oauth", void 0);
__decorate([
    inject(AccountRevocation),
    __metadata("design:type", typeof AccountRevocation === "undefined" ? Object : AccountRevocation)
], DefaultAccountAuthenticator.prototype, "revocation", void 0);
DefaultAccountAuthenticator = __decorate([
    injectable()
], DefaultAccountAuthenticator);
