// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/login/index.ts.
// The original TypeScript and import graph are not restored.














class AccountLogin {
    async signIn(authenticate) {
        const lease = this.state.beginLogin();
        await this.run(lease, authenticate);
    }
    async run(lease, authenticate) {
        let uncommitted;
        try {
            let candidate;
            this.logger.info(ACCOUNT_LOGIN_LOG_CATEGORY, 'authenticating');
            try {
                candidate = await authenticate();
            } catch (error) {
                this.logger.warn(ACCOUNT_LOGIN_LOG_CATEGORY, `authentication failed: ${describeError(error)}`);
                throw interface_error_InterfaceError(error, 'The account login could not be completed.');
            }
            this.logger.info(ACCOUNT_LOGIN_LOG_CATEGORY, `authenticated (${candidate.source})`);
            const record = this.createRecord(candidate);
            uncommitted = record;
            const notice = {
                kind: 'sign-in',
                accountId: record.user.id
            };
            try {
                await this.state.mutate(async ()=>{
                    if (!this.state.ownsLogin(lease)) {
                        throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The account changed before the login could be committed.');
                    }
                    await this.transition.commit(record, notice);
                });
            } catch (error) {
                this.logger.warn(ACCOUNT_LOGIN_LOG_CATEGORY, `commit failed: ${describeError(error)}`);
                throw interface_error_InterfaceError(error, 'The account login could not be committed.');
            }
            uncommitted = undefined;
            this.logger.info(ACCOUNT_LOGIN_LOG_CATEGORY, `committed (${notice.kind})`);
        } finally{
            if (uncommitted) {
                await this.revokeQuietly(uncommitted);
            }
            this.state.finishLogin(lease);
        }
    }
    createRecord(candidate) {
        const { environment } = this.config.current;
        const { accessToken, accessTokenExpiresAt, environment: candidateEnvironment, refreshCredential, user } = candidate;
        const { id: userId } = user;
        if (candidateEnvironment !== environment || !userId || !accessToken || !refreshCredential || !lodash_es_isSafeInteger(accessTokenExpiresAt) || accessTokenExpiresAt <= this.settings.now()) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned an invalid account candidate.');
        }
        return {
            ...candidate,
            schemaVersion: 2,
            user: copyPublicUser(user)
        };
    }
    async revokeQuietly(record) {
        try {
            await this.authenticator.revoke(record);
        } catch  {
        // A candidate that was never committed is disposed on a best-effort basis.
        }
    }
}
__decorate([
    inject(DefaultAccountAuthenticator),
    __metadata("design:type", typeof DefaultAccountAuthenticator === "undefined" ? Object : DefaultAccountAuthenticator)
], AccountLogin.prototype, "authenticator", void 0);
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountLogin.prototype, "state", void 0);
__decorate([
    inject(AccountSettings),
    __metadata("design:type", typeof AccountSettings === "undefined" ? Object : AccountSettings)
], AccountLogin.prototype, "settings", void 0);
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountLogin.prototype, "config", void 0);
__decorate([
    inject(AccountSessionTransition),
    __metadata("design:type", typeof AccountSessionTransition === "undefined" ? Object : AccountSessionTransition)
], AccountLogin.prototype, "transition", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], AccountLogin.prototype, "logger", void 0);
AccountLogin = __decorate([
    injectable()
], AccountLogin);
