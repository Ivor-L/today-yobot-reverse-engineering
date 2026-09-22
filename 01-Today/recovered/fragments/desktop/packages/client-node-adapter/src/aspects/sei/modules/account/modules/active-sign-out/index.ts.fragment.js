// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/active-sign-out/index.ts.
// The original TypeScript and import graph are not restored.









class AccountActiveSignOut {
    run() {
        if (this.flight) {
            return this.flight;
        }
        const flight = this.perform();
        this.flight = flight;
        this.watch(flight);
        return flight;
    }
    async perform() {
        const result = await this.state.mutate(()=>this.transition.runSignOut(true));
        if (result.localCleanupError) {
            throw interface_error_InterfaceError(result.localCleanupError, 'The local account session could not be cleared completely.');
        }
        try {
            await result.nativeCleanup;
        } catch  {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The native account cleanup could not be completed.');
        }
        if (!this.native.isApplied(result.nativeGeneration)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The native account cleanup could not be completed.');
        }
    }
    async watch(flight) {
        try {
            await flight;
        } catch  {
        // Every caller observes the shared active sign-out result.
        }
        if (this.flight === flight) {
            this.flight = undefined;
        }
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountActiveSignOut.prototype, "state", void 0);
__decorate([
    inject(AccountSessionTransition),
    __metadata("design:type", typeof AccountSessionTransition === "undefined" ? Object : AccountSessionTransition)
], AccountActiveSignOut.prototype, "transition", void 0);
__decorate([
    inject(NativeAccountSync),
    __metadata("design:type", typeof NativeAccountSync === "undefined" ? Object : NativeAccountSync)
], AccountActiveSignOut.prototype, "native", void 0);
AccountActiveSignOut = __decorate([
    injectable()
], AccountActiveSignOut);
