// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/shortcuts/index.ts.
// The original TypeScript and import graph are not restored.






class ShortcutsNativeService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    listShortcuts() {
        return this.shell.listShortcuts();
    }
    setShortcutBinding(params) {
        const { shortcutId, binding } = params;
        return this.shell.setShortcutBinding({
            shortcutId,
            binding
        });
    }
}
__decorate([
    inject(ShortcutsShellService),
    __metadata("design:type", typeof ShortcutsShellService === "undefined" ? Object : ShortcutsShellService)
], ShortcutsNativeService.prototype, "shell", void 0);
ShortcutsNativeService = __decorate([
    logCalls(),
    injectable()
], ShortcutsNativeService);
