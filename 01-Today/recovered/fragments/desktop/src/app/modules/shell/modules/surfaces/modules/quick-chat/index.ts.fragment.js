// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/quick-chat/index.ts.
// The original TypeScript and import graph are not restored.







class ShellQuickChat {
    install() {
        if (!this.installResult) {
            this.installResult = this.performInstall();
        }
        return this.installResult;
    }
    /** `reason` 说明是谁要求隐藏，仅用于排障日志。 */ hide(reason = 'owner') {
        this.activationGeneration += 1;
        this.window.hide(reason);
    }
    setSize(params) {
        return this.window.setSize(params);
    }
    prewarm() {
        if (this.destroyed || this.updateRequired) {
            return;
        }
        this.prewarmingEnabled = true;
        this.schedulePrewarm();
    }
    toggle() {
        if (this.destroyed || this.updateRequired) {
            return;
        }
        const activationGeneration = this.activationGeneration;
        const previousToggle = this.toggleSequence;
        this.toggleSequence = this.runToggle(previousToggle, activationGeneration);
    }
    destroy() {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        this.activationGeneration += 1;
        this.window.destroy();
    }
    async performInstall() {
        const { account, shortcuts, update } = this.nodeAdapter.sei;
        let receivedUpdateEvent = false;
        const handleUpdateStateChanged = (state)=>{
            receivedUpdateEvent = true;
            this.handleUpdateStateChanged(state);
        };
        await Promise.all([
            account.subscribe('beforeSignOut', this.handleAccountTransition),
            account.subscribe('beforeSwitch', this.handleAccountTransition),
            account.subscribe('changed', this.handleAccountChanged),
            shortcuts.subscribe('triggered', this.handleShortcutTriggered),
            update.subscribe('stateChanged', handleUpdateStateChanged)
        ]);
        const initialUpdateState = await update.getUpdateState();
        if (!receivedUpdateEvent) {
            this.handleUpdateStateChanged(initialUpdateState);
        }
    }
    resetWindow() {
        this.activationGeneration += 1;
        this.prewarmed = false;
        this.prewarmRequested = false;
        this.window.destroy();
    }
    schedulePrewarm() {
        if (this.destroyed || this.updateRequired || this.prewarmed) {
            return;
        }
        if (this.prewarming) {
            this.prewarmRequested = true;
            return;
        }
        this.prewarmRequested = false;
        const activationGeneration = this.activationGeneration;
        this.prewarming = true;
        this.runScheduledPrewarm(activationGeneration);
    }
    async runScheduledPrewarm(activationGeneration) {
        try {
            await this.performPrewarm(activationGeneration);
        } catch (error) {
            console.error('[desktop] failed to prewarm quick chat', error);
        } finally{
            this.prewarming = false;
            if (this.prewarmRequested) {
                this.prewarmRequested = false;
                this.schedulePrewarm();
            }
        }
    }
    async performPrewarm(activationGeneration) {
        const snapshot = await this.nodeAdapter.sei.account.getFreshAccountSnapshot();
        if (snapshot.status !== (/* inlined export .AccountStatus.SignedIn */"signed-in") || this.destroyed || this.updateRequired || activationGeneration !== this.activationGeneration) {
            return;
        }
        await this.window.prewarm();
        if (this.destroyed || this.updateRequired || activationGeneration !== this.activationGeneration) {
            return;
        }
        this.prewarmed = true;
    }
    async runToggle(previousToggle, activationGeneration) {
        try {
            await previousToggle;
            await this.performToggle(activationGeneration);
        } catch (error) {
            console.error('[desktop] failed to toggle quick chat', error);
        }
    }
    async performToggle(activationGeneration) {
        if (this.destroyed || this.updateRequired || activationGeneration !== this.activationGeneration) {
            return;
        }
        if (this.window.isVisible) {
            this.window.hide('shortcut-toggle');
            return;
        }
        const snapshot = await this.nodeAdapter.sei.account.getAccountSnapshot();
        if (snapshot.status !== (/* inlined export .AccountStatus.SignedIn */"signed-in") || this.destroyed || this.updateRequired || activationGeneration !== this.activationGeneration) {
            return;
        }
        await this.window.open();
    }
    constructor(){
        this.activationGeneration = 0;
        this.destroyed = false;
        this.prewarmingEnabled = false;
        this.prewarmed = false;
        this.prewarming = false;
        this.prewarmRequested = false;
        this.updateRequired = false;
        this.toggleSequence = Promise.resolve();
        this.handleAccountChanged = (snapshot)=>{
            if (snapshot.status === (/* inlined export .AccountStatus.SignedOut */"signed-out")) {
                this.resetWindow();
                return;
            }
            if (this.prewarmingEnabled) {
                this.schedulePrewarm();
            }
        };
        this.handleAccountTransition = ()=>{
            this.resetWindow();
        };
        this.handleShortcutTriggered = (event)=>{
            if (event.shortcutId !== (/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat")) {
                return;
            }
            this.toggle();
        };
        this.handleUpdateStateChanged = (state)=>{
            this.updateRequired = state.requirement === (/* inlined export .UpdateRequirement.Required */"required");
            if (this.updateRequired) {
                this.hide('update-required');
            }
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellQuickChat.prototype, "nodeAdapter", void 0);
__decorate([
    inject(ShellQuickChatWindow),
    __metadata("design:type", typeof ShellQuickChatWindow === "undefined" ? Object : ShellQuickChatWindow)
], ShellQuickChat.prototype, "window", void 0);
ShellQuickChat = __decorate([
    injectable()
], ShellQuickChat);
