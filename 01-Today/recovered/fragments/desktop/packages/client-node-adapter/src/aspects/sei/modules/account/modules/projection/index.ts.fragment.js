// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/projection/index.ts.
// The original TypeScript and import graph are not restored.








class AccountProjection {
    getNativeState() {
        const record = this.state.getRecord();
        const sessionEpoch = String(this.state.getGeneration());
        if (!record) {
            return {
                sessionEpoch,
                status: (/* inlined export .NativeAccountStatus.SignedOut */"signed-out")
            };
        }
        return {
            status: (/* inlined export .NativeAccountStatus.SignedIn */"signed-in"),
            accountId: record.user.id,
            environment: record.environment,
            sessionEpoch
        };
    }
    getSnapshot() {
        const previous = this.state.getDebt()?.previousSnapshot;
        if (previous) {
            return previous;
        }
        const record = this.state.getRecord();
        if (!record) {
            return Object.freeze({
                ...SIGNED_OUT_SNAPSHOT
            });
        }
        return Object.freeze({
            status: (/* inlined export .AccountStatus.SignedIn */"signed-in"),
            user: copyPublicUser(record.user)
        });
    }
    emitIfChanged(previous) {
        const next = this.getSnapshot();
        if (snapshotsEqual(previous, next)) {
            return;
        }
        this.state.publish('changed', next);
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountProjection.prototype, "state", void 0);
AccountProjection = __decorate([
    injectable()
], AccountProjection);
