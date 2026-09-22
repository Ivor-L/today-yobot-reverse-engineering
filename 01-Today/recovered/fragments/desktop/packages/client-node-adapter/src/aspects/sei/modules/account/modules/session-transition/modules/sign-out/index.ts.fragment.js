// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/session-transition/modules/sign-out/index.ts.
// The original TypeScript and import graph are not restored.










class AccountSignOut {
    run(debt) {
        if (this.flight?.debt === debt) {
            return this.flight.promise;
        }
        this.cancelRetry();
        const promise = this.perform(debt);
        const flight = {
            debt,
            promise
        };
        this.flight = flight;
        this.watch(flight);
        return promise;
    }
    async watch(flight) {
        let failed = false;
        try {
            const result = await flight.promise;
            failed = result.localCleanupError !== undefined;
        } catch  {
            failed = true;
        }
        if (this.flight === flight) {
            this.flight = undefined;
        }
        if (failed && this.state.getDebt() === flight.debt) {
            this.scheduleRetry(flight.debt);
        }
    }
    async perform(debt) {
        let error;
        try {
            await this.local.clear();
        } catch (cause) {
            error = cause;
        }
        if (error !== undefined || this.state.getDebt() !== debt) {
            const result = {
                nativeCleanup: Promise.resolve(),
                nativeGeneration: debt.generation
            };
            if (error !== undefined) {
                return {
                    ...result,
                    localCleanupError: error
                };
            }
            return result;
        }
        this.state.finishSignOut(debt);
        this.attempt = 0;
        this.cancelRetry();
        if (debt.event) {
            this.lifecycle.finishSignOut(debt.event, this.projection.getSnapshot());
        } else {
            this.projection.emitIfChanged(debt.previousSnapshot);
        }
        return {
            nativeCleanup: this.native.schedule(),
            nativeGeneration: debt.generation
        };
    }
    scheduleRetry(debt) {
        if (this.timer || this.state.getDebt() !== debt) {
            return;
        }
        const exponent = Math.min(this.attempt, 30);
        const delay = Math.min(this.settings.retryMinMs * 2 ** exponent, this.settings.retryMaxMs);
        this.attempt += 1;
        this.timer = setTimeout(()=>{
            this.timer = undefined;
            this.retryQuietly(debt);
        }, delay);
        this.timer.unref();
    }
    async retryQuietly(debt) {
        try {
            await this.run(debt);
        } catch  {
        // The watcher schedules the next bounded retry.
        }
    }
    cancelRetry() {
        if (!this.timer) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = undefined;
    }
    constructor(){
        this.attempt = 0;
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountSignOut.prototype, "state", void 0);
__decorate([
    inject(AccountLocalSession),
    __metadata("design:type", typeof AccountLocalSession === "undefined" ? Object : AccountLocalSession)
], AccountSignOut.prototype, "local", void 0);
__decorate([
    inject(NativeAccountSync),
    __metadata("design:type", typeof NativeAccountSync === "undefined" ? Object : NativeAccountSync)
], AccountSignOut.prototype, "native", void 0);
__decorate([
    inject(AccountProjection),
    __metadata("design:type", typeof AccountProjection === "undefined" ? Object : AccountProjection)
], AccountSignOut.prototype, "projection", void 0);
__decorate([
    inject(AccountLifecycle),
    __metadata("design:type", typeof AccountLifecycle === "undefined" ? Object : AccountLifecycle)
], AccountSignOut.prototype, "lifecycle", void 0);
__decorate([
    inject(AccountSettings),
    __metadata("design:type", typeof AccountSettings === "undefined" ? Object : AccountSettings)
], AccountSignOut.prototype, "settings", void 0);
AccountSignOut = __decorate([
    injectable()
], AccountSignOut);
