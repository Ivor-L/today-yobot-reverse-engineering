// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/state/modules/account/index.ts.
// The original TypeScript and import graph are not restored.






class ShellTrayAccountState {
    get current() {
        return this.authenticated;
    }
    async prepare(listener) {
        this.listener = listener;
        if (!this.preparation) {
            this.preparation = this.observe();
        }
        await this.preparation;
    }
    destroy() {
        this.destroyed = true;
        this.listener = undefined;
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
            this.authenticated = snapshot.status === (/* inlined export .AccountStatus.SignedIn */"signed-in");
            this.listener?.();
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayAccountState.prototype, "nodeAdapter", void 0);
ShellTrayAccountState = __decorate([
    injectable()
], ShellTrayAccountState);
