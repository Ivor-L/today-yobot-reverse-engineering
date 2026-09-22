// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/state/index.ts.
// The original TypeScript and import graph are not restored.






class ShellTrayState {
    get current() {
        const authenticated = this.account.current;
        return {
            authenticated,
            online: authenticated && this.connectivity.current
        };
    }
    async prepare() {
        await this.account.prepare(this.publish);
    }
    start(listener) {
        this.listener = listener;
        this.connectivity.start(this.publish);
        this.publish();
    }
    destroy() {
        this.listener = undefined;
        this.account.destroy();
        this.connectivity.destroy();
    }
    constructor(){
        this.publish = ()=>{
            this.listener?.(this.current);
        };
    }
}
__decorate([
    inject(ShellTrayAccountState),
    __metadata("design:type", typeof ShellTrayAccountState === "undefined" ? Object : ShellTrayAccountState)
], ShellTrayState.prototype, "account", void 0);
__decorate([
    inject(ShellTrayConnectivityState),
    __metadata("design:type", typeof ShellTrayConnectivityState === "undefined" ? Object : ShellTrayConnectivityState)
], ShellTrayState.prototype, "connectivity", void 0);
ShellTrayState = __decorate([
    injectable()
], ShellTrayState);
