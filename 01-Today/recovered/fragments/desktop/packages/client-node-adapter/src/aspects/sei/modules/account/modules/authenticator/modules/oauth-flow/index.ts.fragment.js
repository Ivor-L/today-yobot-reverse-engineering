// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/oauth-flow/index.ts.
// The original TypeScript and import graph are not restored.

















class AccountOAuthFlow {
    async signIn(provider) {
        this.logger.info(ACCOUNT_OAUTH_LOG_CATEGORY, `sign-in requested: provider=${provider}`);
        const state = base64Url((0,external_node_crypto_namespaceObject.randomBytes)(32));
        const verifier = base64Url((0,external_node_crypto_namespaceObject.randomBytes)(64));
        const challenge = base64Url(await defaultSha256(new TextEncoder().encode(verifier)));
        const request = this.createRequest(provider, state, challenge);
        let session;
        let stagedToken;
        let disposeSession = true;
        try {
            let callbackValue = await this.systemAuthorization.open(provider, request);
            if (callbackValue === null) {
                session = await this.sessions.create();
                callbackValue = await session.openAuthorizationWindow(request);
            }
            const code = readOAuthCallbackCode(callbackValue, request.callbackUrl, state);
            const token = await this.auth.exchangeOAuthCode(code, verifier);
            stagedToken = token;
            return await this.candidate.complete(token, (refreshed)=>{
                stagedToken = refreshed;
            });
        } catch (error) {
            const failure = interface_error_InterfaceError(error);
            if (failure.code === base_InterfaceErrorCode.Cancelled) {
                disposeSession = false;
                this.revocation.revokeOAuthCandidateInBackground(session, stagedToken);
                throw failure;
            }
            await this.revocation.revokeOAuthCandidate(stagedToken);
            throw failure;
        } finally{
            if (disposeSession && session) {
                await this.revocation.dispose(session);
            }
        }
    }
    createRequest(provider, state, challenge) {
        const config = this.config.current;
        const authorizationUrl = new URL('/api/auth/oauth2/authorize', config.authBaseUrl);
        authorizationUrl.searchParams.set('client_id', config.oauthClientId);
        authorizationUrl.searchParams.set('redirect_uri', config.oauthRedirectUri);
        authorizationUrl.searchParams.set('response_type', 'code');
        authorizationUrl.searchParams.set('scope', OAUTH_SCOPE);
        authorizationUrl.searchParams.set('state', state);
        authorizationUrl.searchParams.set('code_challenge', challenge);
        authorizationUrl.searchParams.set('code_challenge_method', 'S256');
        authorizationUrl.searchParams.set('resource', config.audience);
        authorizationUrl.searchParams.set('idp_hint', provider);
        authorizationUrl.searchParams.set('prompt', 'login');
        return {
            authorizationUrl: authorizationUrl.href,
            callbackUrl: config.oauthRedirectUri,
            allowedNavigationHostPatterns: [
                new URL(config.authBaseUrl).hostname,
                new URL(config.webOrigin).hostname,
                ...OAUTH_PROVIDER_NAVIGATION_HOSTS[provider]
            ],
            timeoutMs: (/* inlined export .DEFAULT_OAUTH_TIMEOUT_MS */300000)
        };
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountOAuthFlow.prototype, "config", void 0);
__decorate([
    inject(AccountAuthClient),
    __metadata("design:type", typeof AccountAuthClient === "undefined" ? Object : AccountAuthClient)
], AccountOAuthFlow.prototype, "auth", void 0);
__decorate([
    inject(AccountCandidateFlow),
    __metadata("design:type", typeof AccountCandidateFlow === "undefined" ? Object : AccountCandidateFlow)
], AccountOAuthFlow.prototype, "candidate", void 0);
__decorate([
    inject(AccountIsolatedSessionProvider),
    __metadata("design:type", typeof AccountIsolatedSessionProvider === "undefined" ? Object : AccountIsolatedSessionProvider)
], AccountOAuthFlow.prototype, "sessions", void 0);
__decorate([
    inject(AccountRevocation),
    __metadata("design:type", typeof AccountRevocation === "undefined" ? Object : AccountRevocation)
], AccountOAuthFlow.prototype, "revocation", void 0);
__decorate([
    inject(AccountSystemAuthorization),
    __metadata("design:type", typeof AccountSystemAuthorization === "undefined" ? Object : AccountSystemAuthorization)
], AccountOAuthFlow.prototype, "systemAuthorization", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], AccountOAuthFlow.prototype, "logger", void 0);
AccountOAuthFlow = __decorate([
    injectable()
], AccountOAuthFlow);
