// Compiled fragment from ./src/app/modules/shell/modules/account-windows/index.ts.
// The original TypeScript and import graph are not restored.










class ShellAccountWindows {
    install() {
        if (!this.installResult) {
            this.installResult = this.performInstall();
        }
        return this.installResult;
    }
    async dispose() {
        if (this.stopped) {
            return;
        }
        this.stopped = true;
        this.configuration.application.removeListener('will-quit', this.handleQuit);
        this.closeWindows();
        const subscriptions = this.subscriptions;
        this.subscriptions = [];
        await this.unsubscribe(subscriptions);
    }
    async performInstall() {
        if (this.stopped) {
            return;
        }
        this.configuration.application.once('will-quit', this.handleQuit);
        const subscriptions = [];
        try {
            const { account } = this.nodeAdapter.sei;
            for (const eventName of ACCOUNT_WINDOW_TRANSITION_EVENTS){
                subscriptions.push(await account.subscribe(eventName, this.handleTransition));
            }
            subscriptions.push(await account.subscribe('changed', this.handleChanged));
        } catch (error) {
            this.configuration.application.removeListener('will-quit', this.handleQuit);
            await this.unsubscribe(subscriptions);
            throw error;
        }
        if (this.stopped) {
            await this.unsubscribe(subscriptions);
            return;
        }
        this.subscriptions = subscriptions;
    }
    closeWindows() {
        // Revoke HTTP authority before destroying renderer state. Only Artifact/Brief
        // windows are in this registry; WEI surfaces and isolated popups are separate.
        const contents = this.trust.detachHttpSurfaces();
        for (const sender of contents){
            if (sender.isDestroyed()) {
                continue;
            }
            external_electron_.BrowserWindow.fromWebContents(sender)?.destroy();
        }
    }
    async unsubscribe(subscriptions) {
        await Promise.allSettled(subscriptions.map(async (subscription)=>subscription.unsubscribe()));
    }
    constructor(){
        this.subscriptions = [];
        this.stopped = false;
        this.handleQuit = ()=>{
            this.dispose();
        };
        this.handleTransition = ()=>{
            if (!this.stopped) {
                this.closeWindows();
            }
        };
        this.handleChanged = (snapshot)=>{
            if (snapshot.status === (/* inlined export .AccountStatus.SignedOut */"signed-out")) {
                this.handleTransition();
            }
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellAccountWindows.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellAccountWindows.prototype, "configuration", void 0);
__decorate([
    inject(ShellWebContentsTrust),
    __metadata("design:type", typeof ShellWebContentsTrust === "undefined" ? Object : ShellWebContentsTrust)
], ShellAccountWindows.prototype, "trust", void 0);
ShellAccountWindows = __decorate([
    injectable()
], ShellAccountWindows);
