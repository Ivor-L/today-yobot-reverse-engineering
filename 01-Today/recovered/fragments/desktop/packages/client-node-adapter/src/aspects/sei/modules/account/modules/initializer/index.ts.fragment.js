// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/initializer/index.ts.
// The original TypeScript and import graph are not restored.








class AccountInitializer {
    async run() {
        if (this.ready) {
            return;
        }
        if (this.flight) {
            await this.flight;
            return;
        }
        const flight = this.restoreSafely();
        this.flight = flight;
        try {
            await flight;
        } finally{
            if (this.flight === flight) {
                this.flight = undefined;
            }
        }
    }
    async restoreSafely() {
        try {
            await this.restore();
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The local account session could not be restored.');
        }
    }
    async restore() {
        await this.config.initialize();
        const record = await this.local.initialize();
        this.restoredAccount = record ? {
            accountId: record.user.id,
            environment: record.environment
        } : null;
        this.logger.info('account.initializer', `local session restored: record=${record ? 'present' : 'none'} environment=${this.config.current.environment}`);
        this.transition.restore(record);
        this.ready = true;
    }
    constructor(){
        this.ready = false;
        /** Startup evidence only; a login later in this process is not an upgrade restore. */ this.restoredAccount = null;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], AccountInitializer.prototype, "config", void 0);
__decorate([
    inject(AccountLocalSession),
    __metadata("design:type", typeof AccountLocalSession === "undefined" ? Object : AccountLocalSession)
], AccountInitializer.prototype, "local", void 0);
__decorate([
    inject(AccountSessionTransition),
    __metadata("design:type", typeof AccountSessionTransition === "undefined" ? Object : AccountSessionTransition)
], AccountInitializer.prototype, "transition", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], AccountInitializer.prototype, "logger", void 0);
AccountInitializer = __decorate([
    injectable()
], AccountInitializer);
