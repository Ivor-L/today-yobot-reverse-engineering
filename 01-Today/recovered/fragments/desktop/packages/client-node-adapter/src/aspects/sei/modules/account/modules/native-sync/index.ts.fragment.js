// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/native-sync/index.ts.
// The original TypeScript and import graph are not restored.











class NativeAccountSync {
    isApplied(generation) {
        return this.applies.isApplied(generation);
    }
    advanceApplied(previous, next) {
        this.applies.advance(previous, next);
    }
    async ensure() {
        this.assertReady();
        const generation = this.state.getGeneration();
        if (this.isCurrent(generation)) {
            return;
        }
        if (this.transition?.generation === generation) {
            await this.transition.promise;
            return;
        }
        await this.schedule();
    }
    schedule() {
        this.assertReady();
        this.cancelRetry();
        const generation = this.state.getGeneration();
        if (this.isCurrent(generation)) {
            return Promise.resolve();
        }
        const promise = this.tasks.run(()=>this.runTransition());
        const flight = {
            generation,
            promise
        };
        this.transition = flight;
        this.watchTransition(flight);
        return promise;
    }
    reconcile() {
        this.scheduleQuietly();
    }
    assertReady() {
        if (!this.state.getDebt()) {
            return;
        }
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local account cleanup has not completed.');
    }
    isCurrent(generation) {
        return this.applies.isApplied(generation);
    }
    async watchTransition(flight) {
        try {
            await flight.promise;
        } catch  {
        // The public caller observes this failure; the watcher only owns retries.
        }
        if (this.transition === flight) {
            this.transition = undefined;
        }
        const generation = this.state.getGeneration();
        if (this.isCurrent(generation)) {
            this.resetRetry();
            return;
        }
        this.scheduleRetry();
    }
    async runTransition() {
        this.assertReady();
        if (this.isCurrent(this.state.getGeneration())) {
            return;
        }
        const previousApply = this.applies.getFlight();
        if (previousApply) {
            await withDeadline('wait for the previous account state apply', previousApply.promise, this.settings.nativeTimeoutMs);
        }
        this.assertReady();
        if (this.isCurrent(this.state.getGeneration())) {
            return;
        }
        const generation = this.state.getGeneration();
        const state = this.projection.getNativeState();
        let apply = this.applies.getFlight();
        if (!apply) {
            apply = this.applies.start(generation, state);
        }
        await withDeadline('apply account state', apply.promise, this.settings.nativeTimeoutMs);
        if (!this.applies.isApplied(generation) || this.state.getGeneration() !== generation || !this.applies.matches(state)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The account changed before the native account state was applied.');
        }
    }
    scheduleRetry() {
        if (this.timer || this.isCurrent(this.state.getGeneration())) {
            return;
        }
        const exponent = Math.min(this.attempt, 30);
        const delay = Math.min(this.settings.retryMinMs * 2 ** exponent, this.settings.retryMaxMs);
        this.attempt += 1;
        this.timer = setTimeout(()=>{
            this.timer = undefined;
            this.reconcile();
        }, delay);
        this.timer.unref();
    }
    resetRetry() {
        this.attempt = 0;
        this.cancelRetry();
    }
    cancelRetry() {
        if (!this.timer) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = undefined;
    }
    async scheduleQuietly() {
        try {
            await this.schedule();
        } catch  {
        // Background reconciliation owns its retry lifecycle.
        }
    }
    constructor(){
        this.attempt = 0;
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], NativeAccountSync.prototype, "state", void 0);
__decorate([
    inject(AccountProjection),
    __metadata("design:type", typeof AccountProjection === "undefined" ? Object : AccountProjection)
], NativeAccountSync.prototype, "projection", void 0);
__decorate([
    inject(AccountSettings),
    __metadata("design:type", typeof AccountSettings === "undefined" ? Object : AccountSettings)
], NativeAccountSync.prototype, "settings", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], NativeAccountSync.prototype, "tasks", void 0);
__decorate([
    inject(NativeApplyTracker),
    __metadata("design:type", typeof NativeApplyTracker === "undefined" ? Object : NativeApplyTracker)
], NativeAccountSync.prototype, "applies", void 0);
NativeAccountSync = __decorate([
    injectable()
], NativeAccountSync);
