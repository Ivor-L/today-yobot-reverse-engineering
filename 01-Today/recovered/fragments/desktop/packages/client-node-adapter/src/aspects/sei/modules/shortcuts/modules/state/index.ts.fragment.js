// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/state/index.ts.
// The original TypeScript and import graph are not restored.








class ShortcutsState {
    getBindingOverride(shortcutId) {
        const persisted = this.persisted;
        if (!Object.hasOwn(persisted.bindings, shortcutId)) {
            return {
                configured: false,
                value: null
            };
        }
        return {
            configured: true,
            value: persisted.bindings[shortcutId] ?? null
        };
    }
    async initialize() {
        if (this.persistedValue) {
            return;
        }
        if (this.initialization) {
            await this.initialization;
            return;
        }
        const initialization = this.load();
        this.initialization = initialization;
        try {
            await initialization;
        } finally{
            if (this.initialization === initialization) {
                this.initialization = undefined;
            }
        }
    }
    /** Whether the one-time migration has already been decided on this installation. */ isMigrationApplied(migrationId) {
        return this.persisted.migrations.includes(migrationId);
    }
    async setBinding(shortcutId, binding) {
        await this.mutate((current)=>({
                ...current,
                bindings: {
                    ...current.bindings,
                    [shortcutId]: binding
                }
            }));
    }
    /**
   * Records one migration decision, optionally together with the bindings it
   * imported, in a single atomic write. Recording the decision even when nothing
   * was imported is what keeps a restart from importing again.
   */ async applyMigration(migrationId, bindings = {}) {
        await this.mutate((current)=>({
                bindings: {
                    ...current.bindings,
                    ...bindings
                },
                migrations: current.migrations.includes(migrationId) ? current.migrations : [
                    ...current.migrations,
                    migrationId
                ]
            }));
    }
    get persisted() {
        if (!this.persistedValue) {
            throw new Error('The persisted shortcuts are not available.');
        }
        return this.persistedValue;
    }
    async mutate(mutation) {
        await this.initialize();
        const previous = this.mutation;
        const next = this.runMutation(previous, mutation);
        this.mutation = next;
        await next;
    }
    async runMutation(previous, mutation) {
        try {
            await previous;
        } catch  {
        // A failed mutation must not poison the serial queue.
        }
        const updated = mutation(this.persisted);
        await this.store.write(this.filePath, updated);
        this.persistedValue = updated;
    }
    get filePath() {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath), SHORTCUT_SETTINGS_FILE_NAME);
    }
    async load() {
        this.persistedValue = await this.store.read(this.filePath);
    }
    constructor(){
        this.mutation = Promise.resolve();
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], ShortcutsState.prototype, "preferences", void 0);
__decorate([
    inject(ShortcutsStore),
    __metadata("design:type", typeof ShortcutsStore === "undefined" ? Object : ShortcutsStore)
], ShortcutsState.prototype, "store", void 0);
ShortcutsState = __decorate([
    injectable()
], ShortcutsState);
