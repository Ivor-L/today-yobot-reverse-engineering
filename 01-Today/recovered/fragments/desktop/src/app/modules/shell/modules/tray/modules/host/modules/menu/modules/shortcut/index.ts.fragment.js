// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/host/modules/menu/modules/shortcut/index.ts.
// The original TypeScript and import graph are not restored.






class ShellTrayShortcut {
    get current() {
        return this.binding;
    }
    start() {
        if (this.started) {
            return;
        }
        this.started = true;
        this.generation += 1;
        this.startObservation(this.generation);
    }
    destroy() {
        this.started = false;
        this.generation += 1;
        this.binding = undefined;
        const subscription = this.subscription;
        this.subscription = undefined;
        if (subscription) {
            this.release(subscription);
        }
    }
    async startObservation(generation) {
        try {
            await this.observe(generation);
        } catch (error) {
            console.error('[desktop] failed to observe the Quick Chat shortcut for the tray', error);
        }
    }
    async observe(generation) {
        const shortcuts = this.nodeAdapter.sei.shortcuts;
        const handleChanged = (shortcut)=>{
            this.handleChanged(shortcut, generation);
        };
        const subscription = await shortcuts.subscribe('changed', handleChanged);
        if (!this.isCurrent(generation)) {
            await this.release(subscription);
            return;
        }
        this.subscription = subscription;
        const shortcut = (await shortcuts.listShortcuts()).find((item)=>item.id === (/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat"));
        if (!this.isCurrent(generation) || this.subscription !== subscription) {
            return;
        }
        this.update(shortcut);
    }
    isCurrent(generation) {
        return this.started && this.generation === generation;
    }
    update(shortcut) {
        if (shortcut?.enabled && shortcut.binding) {
            this.binding = shortcut.binding;
            return;
        }
        this.binding = undefined;
    }
    async release(subscription) {
        try {
            await subscription.unsubscribe();
        } catch  {
        // Subscription cleanup is best-effort during shell teardown.
        }
    }
    constructor(){
        this.generation = 0;
        this.started = false;
        this.handleChanged = (shortcut, generation)=>{
            if (!this.isCurrent(generation) || shortcut.id !== (/* inlined export .WellKnownShortcutId.QuickChat */"quick-chat")) {
                return;
            }
            this.update(shortcut);
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayShortcut.prototype, "nodeAdapter", void 0);
ShellTrayShortcut = __decorate([
    injectable()
], ShellTrayShortcut);
