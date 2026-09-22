// Compiled fragment from ./src/app/modules/shell/modules/lifecycle/modules/update/index.ts.
// The original TypeScript and import graph are not restored.







class ShellUpdateLifecycle {
    async launch() {
        if (this.launched) {
            return;
        }
        await this.nodeAdapter.sei.update.subscribe('stateChanged', this.handleStateChanged);
        this.launched = true;
    }
    constructor(){
        this.applying = false;
        this.launched = false;
        this.handleStateChanged = (state)=>{
            if (state.status === (/* inlined export .UpdateStatus.Applying */"applying")) {
                this.applying = true;
                this.quitState.begin();
                return;
            }
            if (state.status !== (/* inlined export .UpdateStatus.Failed */"failed") || !this.applying) {
                return;
            }
            this.applying = false;
            this.quitState.cancel();
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellUpdateLifecycle.prototype, "nodeAdapter", void 0);
__decorate([
    inject(ShellQuitState),
    __metadata("design:type", typeof ShellQuitState === "undefined" ? Object : ShellQuitState)
], ShellUpdateLifecycle.prototype, "quitState", void 0);
ShellUpdateLifecycle = __decorate([
    injectable()
], ShellUpdateLifecycle);
