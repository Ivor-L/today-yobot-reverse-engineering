// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/local-session/index.ts.
// The original TypeScript and import graph are not restored.











class AccountLocalSession {
    async initialize() {
        // CookieJar contents are never account authority, including old mirrored sessions.
        const removed = await this.web.clear();
        const record = await this.store.load();
        if (removed > 0) {
            this.logger.info(ACCOUNT_LOCAL_SESSION_LOG_CATEGORY, `cleared ${removed} legacy auth cookie(s) from the Web runtime`);
            if (!record) {
                this.tracer.pushSessionReset({
                    cause: 'sync'
                });
            }
        }
        if (record && record.environment !== this.config.current.environment) {
            await this.store.clear();
            this.tracer.pushSessionReset({
                cause: 'env'
            });
            return null;
        }
        return record;
    }
    async commit(record, previous, onRollbackFailure) {
        try {
            await this.web.clear();
            await this.store.save(record);
        } catch (error) {
            await this.rollback(previous, onRollbackFailure);
            throw interface_error_InterfaceError(error, 'The account credentials could not be persisted.');
        }
    }
    async clear() {
        await this.store.clear();
        await this.web.clear();
    }
    async rollback(record, onFailure) {
        try {
            if (record) {
                await this.store.save(record);
            } else {
                await this.store.clear();
            }
        } catch  {
            await onFailure();
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The account credential transaction could not be rolled back safely.');
        }
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountLocalSession.prototype, "config", void 0);
__decorate([
    inject(EncryptedAccountCredentialStore),
    __metadata("design:type", typeof EncryptedAccountCredentialStore === "undefined" ? Object : EncryptedAccountCredentialStore)
], AccountLocalSession.prototype, "store", void 0);
__decorate([
    inject(ElectronAccountWebSession),
    __metadata("design:type", typeof ElectronAccountWebSession === "undefined" ? Object : ElectronAccountWebSession)
], AccountLocalSession.prototype, "web", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], AccountLocalSession.prototype, "logger", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], AccountLocalSession.prototype, "tracer", void 0);
AccountLocalSession = __decorate([
    injectable()
], AccountLocalSession);
