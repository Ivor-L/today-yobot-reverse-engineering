// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/session-transition/index.ts.
// The original TypeScript and import graph are not restored.













class AccountSessionTransition {
    restore(record) {
        const previous = this.projection.getSnapshot();
        this.state.set(record, this.state.getGeneration() + 1);
        this.projection.emitIfChanged(previous);
        this.native.reconcile();
    }
    async commit(record, notice) {
        const lease = this.sessionBarrier.suspend();
        try {
            const previousRecord = this.state.getRecord();
            const previousSnapshot = this.projection.getSnapshot();
            await this.local.commit(record, previousRecord, ()=>this.clearAfterRollback());
            this.state.set(record, this.state.getGeneration() + 1);
            this.lifecycle.commit(notice, previousSnapshot, this.projection.getSnapshot());
            this.native.reconcile();
        } finally{
            lease.release();
        }
    }
    async runSignOut(revokeRemote) {
        const lease = this.sessionBarrier.suspend();
        try {
            return await this.performSignOut(revokeRemote);
        } finally{
            lease.release();
        }
    }
    async clearAfterRollback() {
        const lease = this.sessionBarrier.suspend();
        try {
            const trace = this.state.getDebt() === undefined;
            const debt = this.beginDebt();
            if (trace) {
                this.tracer.pushSessionReset({
                    cause: 'save',
                    issue: true
                });
            }
            await this.signOut.run(debt);
        } finally{
            lease.release();
        }
    }
    async performSignOut(revokeRemote) {
        const activeDebt = this.state.getDebt();
        if (activeDebt) {
            return await this.signOut.run(activeDebt);
        }
        const record = this.state.getRecord();
        if (!record) {
            let event;
            if (revokeRemote) {
                event = this.lifecycle.beginSignOut();
            }
            const previousGeneration = this.state.getGeneration();
            const applied = this.native.isApplied(previousGeneration);
            const generation = previousGeneration + 1;
            this.state.set(null, generation);
            this.state.cancelLogin();
            if (applied) {
                this.native.advanceApplied(previousGeneration, generation);
            }
            if (event) {
                this.lifecycle.finishEmptySignOut(event);
            }
            return {
                nativeCleanup: this.native.schedule(),
                nativeGeneration: generation
            };
        }
        let event;
        if (revokeRemote) {
            event = this.lifecycle.beginSignOut(record.user.id);
        }
        const debt = this.beginDebt(event);
        if (revokeRemote) {
            this.revokeQuietly(record);
        }
        return await this.signOut.run(debt);
    }
    beginDebt(event) {
        return this.state.beginSignOut(this.projection.getSnapshot(), event);
    }
    async revokeQuietly(record) {
        try {
            await this.authenticator.revoke(record);
        } catch  {
        // Local sign-out does not wait for remote revoke.
        }
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountSessionTransition.prototype, "state", void 0);
__decorate([
    inject(AccountLocalSession),
    __metadata("design:type", typeof AccountLocalSession === "undefined" ? Object : AccountLocalSession)
], AccountSessionTransition.prototype, "local", void 0);
__decorate([
    inject(AccountSignOut),
    __metadata("design:type", typeof AccountSignOut === "undefined" ? Object : AccountSignOut)
], AccountSessionTransition.prototype, "signOut", void 0);
__decorate([
    inject(NativeAccountSync),
    __metadata("design:type", typeof NativeAccountSync === "undefined" ? Object : NativeAccountSync)
], AccountSessionTransition.prototype, "native", void 0);
__decorate([
    inject(AccountProjection),
    __metadata("design:type", typeof AccountProjection === "undefined" ? Object : AccountProjection)
], AccountSessionTransition.prototype, "projection", void 0);
__decorate([
    inject(DefaultAccountAuthenticator),
    __metadata("design:type", typeof DefaultAccountAuthenticator === "undefined" ? Object : DefaultAccountAuthenticator)
], AccountSessionTransition.prototype, "authenticator", void 0);
__decorate([
    inject(AccountLifecycle),
    __metadata("design:type", typeof AccountLifecycle === "undefined" ? Object : AccountLifecycle)
], AccountSessionTransition.prototype, "lifecycle", void 0);
__decorate([
    inject(AccountSessionBarrier),
    __metadata("design:type", typeof AccountSessionBarrier === "undefined" ? Object : AccountSessionBarrier)
], AccountSessionTransition.prototype, "sessionBarrier", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], AccountSessionTransition.prototype, "tracer", void 0);
AccountSessionTransition = __decorate([
    injectable()
], AccountSessionTransition);
