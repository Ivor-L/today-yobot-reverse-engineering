// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/login-candidate/index.ts.
// The original TypeScript and import graph are not restored.











class AccountCandidateFlow {
    async verifyEmailCode(email, code) {
        const session = await this.sessions.create();
        let stagedToken;
        try {
            const token = await this.auth.verifyEmailCode(session.fetch, email, code);
            stagedToken = token;
            const sessionIdentity = await this.auth.readSessionIdentity(session.fetch);
            const candidate = await this.complete(token, (refreshed)=>{
                stagedToken = refreshed;
            });
            this.assertMatchingIdentity(sessionIdentity, candidate.user);
            return candidate;
        } catch (error) {
            await this.revocation.revokeOtpCandidate(session, stagedToken);
            throw interface_error_InterfaceError(error);
        } finally{
            await this.revocation.dispose(session);
        }
    }
    async verifyPhoneCode(phoneNumber, code) {
        const session = await this.sessions.create();
        let stagedToken;
        try {
            const token = await this.auth.verifyPhoneCode(session.fetch, phoneNumber, code);
            stagedToken = token;
            const sessionIdentity = await this.auth.readSessionIdentity(session.fetch);
            const candidate = await this.complete(token, (refreshed)=>{
                stagedToken = refreshed;
            });
            this.assertMatchingIdentity(sessionIdentity, candidate.user);
            return candidate;
        } catch (error) {
            await this.revocation.revokeOtpCandidate(session, stagedToken);
            throw interface_error_InterfaceError(error);
        } finally{
            await this.revocation.dispose(session);
        }
    }
    async complete(initialToken, onTokenRefreshed) {
        const authenticated = await this.readCurrentUserWithRefresh(initialToken, onTokenRefreshed);
        return {
            environment: this.config.current.environment,
            ...authenticated.token,
            user: authenticated.user
        };
    }
    async readCurrentUserWithRefresh(initialToken, onTokenRefreshed) {
        try {
            return {
                token: initialToken,
                user: await this.profile.readCurrentUser(initialToken.accessToken)
            };
        } catch (error) {
            if (!(error instanceof interface_error_InterfaceError) || error.code !== base_InterfaceErrorCode.AuthRequired) {
                throw interface_error_InterfaceError(error);
            }
        }
        const refreshedToken = await this.auth.refreshToken(initialToken, false);
        onTokenRefreshed(refreshedToken);
        return {
            token: refreshedToken,
            user: await this.profile.readCurrentUser(refreshedToken.accessToken)
        };
    }
    assertMatchingIdentity(sessionIdentity, user) {
        if (sessionIdentity.userId !== user.id) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The authenticated account identities did not match.');
        }
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountCandidateFlow.prototype, "config", void 0);
__decorate([
    inject(AccountAuthClient),
    __metadata("design:type", typeof AccountAuthClient === "undefined" ? Object : AccountAuthClient)
], AccountCandidateFlow.prototype, "auth", void 0);
__decorate([
    inject(AccountProfileClient),
    __metadata("design:type", typeof AccountProfileClient === "undefined" ? Object : AccountProfileClient)
], AccountCandidateFlow.prototype, "profile", void 0);
__decorate([
    inject(AccountIsolatedSessionProvider),
    __metadata("design:type", typeof AccountIsolatedSessionProvider === "undefined" ? Object : AccountIsolatedSessionProvider)
], AccountCandidateFlow.prototype, "sessions", void 0);
__decorate([
    inject(AccountRevocation),
    __metadata("design:type", typeof AccountRevocation === "undefined" ? Object : AccountRevocation)
], AccountCandidateFlow.prototype, "revocation", void 0);
AccountCandidateFlow = __decorate([
    injectable()
], AccountCandidateFlow);
