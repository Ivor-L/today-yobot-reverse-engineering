// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/lifecycle/index.ts.
// The original TypeScript and import graph are not restored.







class AccountLifecycle {
    beginSwitch(accountId) {
        const previousAccountId = this.state.getRecord()?.user.id;
        const event = {
            origin: (/* inlined export .AccountEventOrigin.CurrentContext */"current-context"),
            accountId
        };
        if (previousAccountId !== undefined) {
            event.previousAccountId = previousAccountId;
        }
        this.state.publish('beforeSwitch', event);
        return event;
    }
    beginSignOut(accountId) {
        const event = {
            origin: (/* inlined export .AccountEventOrigin.CurrentContext */"current-context")
        };
        if (accountId !== undefined) {
            event.accountId = accountId;
        }
        this.state.publish('beforeSignOut', event);
        return event;
    }
    commit(notice, previous, snapshot) {
        if (notice.kind === 'sign-in') {
            this.state.publish('afterSignIn', {
                origin: (/* inlined export .AccountEventOrigin.CurrentContext */"current-context"),
                accountId: notice.accountId
            });
            if (!snapshotsEqual(previous, snapshot)) {
                this.state.publish('changed', snapshot);
            }
            return;
        }
        this.state.publish('afterSwitch', notice.event);
        this.state.publish('changed', snapshot);
    }
    finishSignOut(event, snapshot) {
        this.state.publish('afterSignOut', event);
        this.state.publish('changed', snapshot);
    }
    finishEmptySignOut(event) {
        this.state.publish('afterSignOut', event);
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountLifecycle.prototype, "state", void 0);
AccountLifecycle = __decorate([
    injectable()
], AccountLifecycle);
