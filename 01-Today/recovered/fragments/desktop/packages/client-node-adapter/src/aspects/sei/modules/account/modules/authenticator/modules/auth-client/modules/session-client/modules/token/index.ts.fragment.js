// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/session-client/modules/token/index.ts.
// The original TypeScript and import graph are not restored.











class AccountSessionTokenClient {
    async issue(fetcher, sessionToken, terminal) {
        const config = this.config.current;
        const response = await this.http.request(fetcher, new URL('/api/auth/token', config.authBaseUrl), {
            method: 'GET',
            headers: await this.http.headers({
                bearerToken: sessionToken,
                includeOrigin: true
            }),
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response, {
                terminalOnInvalidCredential: terminal
            }));
        }
        return this.read(await this.http.readJson(response));
    }
    async refresh(token, terminal) {
        const credential = assertRefreshCredential(token.refreshCredential, 'better-auth-session', terminal);
        const jwt = await this.issue(globalThis.fetch, credential, terminal);
        return {
            source: 'better-auth-session',
            accessToken: jwt.accessToken,
            accessTokenExpiresAt: resolveTokenExpiry(jwt.accessToken, jwt.expiresInSeconds, Date.now()),
            refreshCredential: token.refreshCredential
        };
    }
    async establish(fetcher, credential) {
        const sessionToken = assertRefreshCredential(credential, 'better-auth-session');
        const jwt = await this.issue(fetcher, sessionToken, false);
        return {
            source: 'better-auth-session',
            accessToken: jwt.accessToken,
            accessTokenExpiresAt: resolveTokenExpiry(jwt.accessToken, jwt.expiresInSeconds, Date.now()),
            refreshCredential: sessionToken
        };
    }
    read(payload) {
        if (!utils_isJsonObject(payload)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid credentials.');
        }
        const accessToken = assertAccessToken(payload['token']);
        const declaredExpiry = payload['expiresIn'] ?? payload['expires_in'];
        let expiresInSeconds = (/* inlined export .BETTER_AUTH_JWT_FALLBACK_TTL_SECONDS */540);
        if (lodash_es_isNumber(declaredExpiry) && lodash_es_isFinite(declaredExpiry) && declaredExpiry > 0) {
            expiresInSeconds = declaredExpiry;
        }
        return {
            accessToken,
            expiresInSeconds
        };
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountSessionTokenClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountSessionTokenClient.prototype, "http", void 0);
AccountSessionTokenClient = __decorate([
    injectable()
], AccountSessionTokenClient);
