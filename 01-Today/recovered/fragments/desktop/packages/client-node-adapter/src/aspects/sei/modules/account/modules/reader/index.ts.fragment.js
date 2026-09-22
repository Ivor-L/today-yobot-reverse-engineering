// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/reader/index.ts.
// The original TypeScript and import graph are not restored.












class AccountReader {
    async getSnapshotWithoutRefresh() {
        await this.init.run();
        return this.projection.getSnapshot();
    }
    async getSnapshot() {
        await this.init.run();
        const record = this.state.getRecord();
        if (!record) {
            if (this.state.getDebt()) {
                return this.projection.getSnapshot();
            }
            this.native.reconcile();
            return this.projection.getSnapshot();
        }
        try {
            await this.refresh.ensure(record, this.state.getGeneration());
        } catch (error) {
            if (this.state.getRecord() === null && error instanceof interface_error_InterfaceError && error.code === base_InterfaceErrorCode.AuthRequired) {
                if (this.state.getDebt()) {
                    throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local account session is still being cleared.');
                }
                return this.projection.getSnapshot();
            }
            throw interface_error_InterfaceError(error);
        }
        this.native.reconcile();
        return this.projection.getSnapshot();
    }
    async getMainAuthContext() {
        const lease = await this.getLease();
        return lease?.context ?? null;
    }
    async getAuthContext() {
        const lease = await this.getLease();
        if (!lease) {
            this.native.reconcile();
            return null;
        }
        try {
            await this.native.ensure();
        } catch  {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The native account state is not currently available.');
        }
        if (!this.native.isApplied(lease.generation) || this.state.getGeneration() !== lease.generation || this.state.getRecord() !== lease.record) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The native account state has not been synchronized.');
        }
        return lease.context;
    }
    async getSocketContext(options) {
        const lease = await this.getLease(options);
        if (!lease) {
            return null;
        }
        return {
            ...lease.context,
            sessionGeneration: lease.generation
        };
    }
    async getLease(options) {
        await this.init.run();
        const initialRecord = this.state.getRecord();
        if (!initialRecord) {
            return null;
        }
        const generation = this.state.getGeneration();
        const record = await this.refresh.ensure(initialRecord, generation, options);
        if (this.state.getGeneration() !== generation || this.state.getRecord() !== record) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account changed while refreshing authentication.');
        }
        // lane 归属在 Node 且运行期可变：随每次凭据下发给 Native，Native 零自有配置。
        // preferences 未就绪时（value 抛 Unavailable）按无 lane 处理——
        // 凭据可用性不应被一个路由偏好拖垮。
        let trafficLane = null;
        try {
            trafficLane = this.preferences.trafficLane.value;
        } catch  {
            trafficLane = null;
        }
        return {
            generation,
            record,
            context: {
                accessToken: record.accessToken,
                expiresAt: record.accessTokenExpiresAt,
                accountId: record.user.id,
                environment: record.environment,
                ...trafficLane ? {
                    trafficLane
                } : {}
            }
        };
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountReader.prototype, "state", void 0);
__decorate([
    inject(AccountInitializer),
    __metadata("design:type", typeof AccountInitializer === "undefined" ? Object : AccountInitializer)
], AccountReader.prototype, "init", void 0);
__decorate([
    inject(AccountRefresh),
    __metadata("design:type", typeof AccountRefresh === "undefined" ? Object : AccountRefresh)
], AccountReader.prototype, "refresh", void 0);
__decorate([
    inject(NativeAccountSync),
    __metadata("design:type", typeof NativeAccountSync === "undefined" ? Object : NativeAccountSync)
], AccountReader.prototype, "native", void 0);
__decorate([
    inject(AccountProjection),
    __metadata("design:type", typeof AccountProjection === "undefined" ? Object : AccountProjection)
], AccountReader.prototype, "projection", void 0);
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], AccountReader.prototype, "preferences", void 0);
AccountReader = __decorate([
    injectable()
], AccountReader);
