// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/revocation/index.ts.
// The original TypeScript and import graph are not restored.








class AccountRevocation {
    async revoke(token) {
        try {
            if (token.source === 'oauth2') {
                await this.auth.revokeOAuthCredential(token.refreshCredential);
                return;
            }
            await this.auth.revokeWebSession(globalThis.fetch, assertRefreshCredential(token.refreshCredential, 'better-auth-session'));
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The remote account session could not be revoked.', {
                cause: error
            });
        }
    }
    async revokeOAuthCandidate(token) {
        if (!token) {
            return;
        }
        try {
            await this.auth.revokeOAuthCredential(token.refreshCredential);
        } catch  {
        // Candidate cleanup must preserve the sign-in failure.
        }
    }
    async revokeOtpCandidate(session, token) {
        try {
            // This CookieJar belongs only to this OTP attempt. It is needed if session creation
            // succeeded but the subsequent JWT exchange failed before returning a TokenSet.
            await this.auth.revokeWebSession(session.fetch, token?.refreshCredential);
        } catch  {
        // Candidate cleanup must preserve the sign-in failure.
        }
    }
    async revokeOAuthCandidateInBackground(session, token) {
        try {
            await this.revokeOAuthCandidate(token);
        } finally{
            if (session) {
                await this.dispose(session);
            }
        }
    }
    async dispose(session) {
        try {
            await session.dispose();
        } catch  {
        // Cleanup must not mask the account operation result.
        }
    }
}
__decorate([
    inject(AccountAuthClient),
    __metadata("design:type", typeof AccountAuthClient === "undefined" ? Object : AccountAuthClient)
], AccountRevocation.prototype, "auth", void 0);
AccountRevocation = __decorate([
    injectable()
], AccountRevocation);
