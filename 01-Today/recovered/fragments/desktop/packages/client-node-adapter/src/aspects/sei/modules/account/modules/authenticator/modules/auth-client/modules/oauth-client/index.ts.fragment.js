// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/auth-client/modules/oauth-client/index.ts.
// The original TypeScript and import graph are not restored.










class AccountOAuthClient {
    async exchangeCode(code, verifier) {
        const config = this.config.current;
        const body = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.oauthClientId,
            code,
            redirect_uri: config.oauthRedirectUri,
            code_verifier: verifier,
            resource: config.audience
        });
        const response = await this.http.request(globalThis.fetch, new URL('/api/auth/oauth2/token', config.authBaseUrl), {
            method: 'POST',
            headers: await this.http.headers({
                contentType: 'application/x-www-form-urlencoded',
                includeOrigin: true
            }),
            body,
            credentials: 'omit',
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response, {
                recognizeRegistrationRestriction: true
            }));
        }
        const token = this.readToken(await this.http.readJson(response), true);
        return {
            source: 'oauth2',
            accessToken: token.accessToken,
            accessTokenExpiresAt: resolveTokenExpiry(token.accessToken, token.expiresInSeconds, Date.now()),
            refreshCredential: assertRefreshCredential(token.refreshToken, 'oauth2')
        };
    }
    async refresh(token, terminal) {
        const config = this.config.current;
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.oauthClientId,
            refresh_token: assertRefreshCredential(token.refreshCredential, 'oauth2', terminal),
            resource: config.audience
        });
        const response = await this.http.request(globalThis.fetch, new URL('/api/auth/oauth2/token', config.authBaseUrl), {
            method: 'POST',
            headers: await this.http.headers({
                contentType: 'application/x-www-form-urlencoded',
                includeOrigin: true
            }),
            body,
            credentials: 'omit',
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response, {
                terminalOnInvalidCredential: terminal
            }));
        }
        const refreshed = this.readToken(await this.http.readJson(response), false);
        return {
            source: 'oauth2',
            accessToken: refreshed.accessToken,
            accessTokenExpiresAt: resolveTokenExpiry(refreshed.accessToken, refreshed.expiresInSeconds, Date.now()),
            refreshCredential: refreshed.refreshToken ?? token.refreshCredential
        };
    }
    async revoke(refreshCredential) {
        const config = this.config.current;
        const response = await this.http.request(globalThis.fetch, new URL('/api/auth/oauth2/revoke', config.authBaseUrl), {
            method: 'POST',
            headers: await this.http.headers({
                contentType: 'application/x-www-form-urlencoded',
                includeOrigin: true
            }),
            body: new URLSearchParams({
                token: assertRefreshCredential(refreshCredential, 'oauth2'),
                token_type_hint: 'refresh_token',
                client_id: config.oauthClientId
            }),
            credentials: 'omit',
            redirect: 'error'
        });
        if (!response.ok) {
            throw interface_error_InterfaceError(await this.http.responseError(response));
        }
    }
    readToken(payload, requireRefreshToken) {
        if (!utils_isJsonObject(payload)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid credentials.');
        }
        const accessToken = assertAccessToken(payload['access_token']);
        const rawRefreshToken = asNonEmptyString(payload['refresh_token']);
        let refreshToken;
        if (rawRefreshToken) {
            refreshToken = assertRefreshCredential(rawRefreshToken, 'oauth2');
        }
        const expiresInSeconds = payload['expires_in'];
        if (!lodash_es_isNumber(expiresInSeconds) || !lodash_es_isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid credentials.');
        }
        if (requireRefreshToken && !refreshToken) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned incomplete credentials.');
        }
        const response = {
            accessToken,
            expiresInSeconds
        };
        if (!refreshToken) {
            return response;
        }
        return {
            ...response,
            refreshToken
        };
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountOAuthClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountOAuthClient.prototype, "http", void 0);
AccountOAuthClient = __decorate([
    injectable()
], AccountOAuthClient);
