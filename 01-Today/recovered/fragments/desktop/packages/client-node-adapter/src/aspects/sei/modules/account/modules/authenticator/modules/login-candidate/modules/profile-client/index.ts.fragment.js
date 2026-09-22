// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/authenticator/modules/login-candidate/modules/profile-client/index.ts.
// The original TypeScript and import graph are not restored.










class AccountProfileClient {
    async readCurrentUser(accessToken) {
        const config = this.config.current;
        const apiFetch = async (input, init)=>await this.http.request(globalThis.fetch, input, init);
        const headers = await this.http.headers({
            target: 'api'
        });
        const client = createClient({
            baseUrl: config.apiBaseUrl,
            auth: accessToken,
            fetch: apiFetch,
            redirect: 'error',
            headers
        });
        const result = await getV1UsersMe({
            client
        });
        if (!result.response?.ok || !result.data) {
            if (!result.response && result.error instanceof interface_error_InterfaceError) {
                throw interface_error_InterfaceError(result.error);
            }
            if (result.response) {
                throw interface_error_InterfaceError(await this.http.responseError(result.response));
            }
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'The account profile could not be loaded.', {
                cause: result.error
            });
        }
        return this.toPublicUser(result.data);
    }
    toPublicUser(payload) {
        const raw = payload;
        if (!utils_isJsonObject(raw)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The account service returned an invalid user profile.');
        }
        const id = asNonEmptyString(raw['id']);
        if (!id) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The account service returned an invalid user profile.');
        }
        let profile = {};
        if (utils_isJsonObject(raw['profile'])) {
            profile = raw['profile'];
        }
        let account = {};
        if (utils_isJsonObject(raw['account'])) {
            account = raw['account'];
        }
        const displayName = asNonEmptyString(profile['preferredName']);
        const email = asNonEmptyString(account['email']);
        const rawAvatarUrl = asNonEmptyString(profile['avatarUrl']);
        const avatarUrl = this.readAvatarUrl(rawAvatarUrl);
        const user = {
            id
        };
        if (displayName) {
            user.displayName = displayName;
        }
        if (email) {
            user.email = email;
        }
        if (avatarUrl) {
            user.avatarUrl = avatarUrl;
        }
        return user;
    }
    readAvatarUrl(value) {
        if (!value) {
            return undefined;
        }
        try {
            const url = new URL(value);
            if (url.protocol === 'https:' && !url.username && !url.password) {
                return url.href;
            }
        } catch  {
        // Non-URL storage references are intentionally hidden from WEI.
        }
        return undefined;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountProfileClient.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], AccountProfileClient.prototype, "http", void 0);
AccountProfileClient = __decorate([
    injectable()
], AccountProfileClient);
