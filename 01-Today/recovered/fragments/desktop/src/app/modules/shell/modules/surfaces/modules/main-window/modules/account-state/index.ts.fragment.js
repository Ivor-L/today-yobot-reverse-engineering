// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/main-window/modules/account-state/index.ts.
// The original TypeScript and import graph are not restored.






class ShellMainWindowAccountState {
    install() {
        if (!this.installResult) {
            this.installResult = this.observe();
        }
        return this.installResult;
    }
    consume() {
        const authenticated = this.authenticated;
        this.destroy();
        return authenticated;
    }
    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.authenticated = false;
        const subscription = this.subscription;
        this.subscription = undefined;
        if (subscription) {
            this.release(subscription);
        }
    }
    async observe() {
        const subscription = await this.nodeAdapter.sei.account.subscribe('changed', this.handleChanged);
        if (this.destroyed) {
            await this.release(subscription);
            return;
        }
        this.subscription = subscription;
    }
    async release(subscription) {
        try {
            await subscription.unsubscribe();
        } catch  {
        // Subscription cleanup is best-effort during shell teardown.
        }
    }
    constructor(){
        this.authenticated = false;
        this.destroyed = false;
        this.handleChanged = (snapshot)=>{
            if (this.destroyed) {
                return;
            }
            this.authenticated = snapshot.status === (/* inlined export .AccountStatus.SignedIn */"signed-in");
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellMainWindowAccountState.prototype, "nodeAdapter", void 0);
ShellMainWindowAccountState = __decorate([
    injectable()
], ShellMainWindowAccountState);
