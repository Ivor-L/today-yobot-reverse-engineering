// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/native-sync/modules/apply-tracker/index.ts.
// The original TypeScript and import graph are not restored.








class NativeApplyTracker {
    getFlight() {
        return this.flight;
    }
    isApplied(generation) {
        return this.applied === generation;
    }
    matches(state) {
        return lodash_es_isEqual(this.projection.getNativeState(), state);
    }
    advance(previous, next) {
        if (this.applied !== previous) {
            return;
        }
        this.applied = next;
    }
    start(generation, state) {
        const flight = {
            generation,
            state,
            promise: this.applyState(state)
        };
        this.flight = flight;
        this.watch(flight);
        return flight;
    }
    async applyState(state) {
        await this.cpi.account.applyAccountState(state);
    }
    async watch(flight) {
        let succeeded = false;
        try {
            await flight.promise;
            succeeded = true;
        } catch  {
        // The transition maps the apply failure at its interface boundary.
        }
        if (this.flight !== flight) {
            return;
        }
        this.flight = undefined;
        const current = this.account.getGeneration() === flight.generation && this.matches(flight.state);
        if (succeeded && current) {
            this.applied = flight.generation;
        }
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof AccountCpi === "undefined" ? Object : AccountCpi)
], NativeApplyTracker.prototype, "cpi", void 0);
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], NativeApplyTracker.prototype, "account", void 0);
__decorate([
    inject(AccountProjection),
    __metadata("design:type", typeof AccountProjection === "undefined" ? Object : AccountProjection)
], NativeApplyTracker.prototype, "projection", void 0);
NativeApplyTracker = __decorate([
    injectable()
], NativeApplyTracker);
