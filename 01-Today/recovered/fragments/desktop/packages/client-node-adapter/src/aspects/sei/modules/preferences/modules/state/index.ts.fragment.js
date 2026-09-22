// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/state/index.ts.
// The original TypeScript and import graph are not restored.








class PreferencesState {
    get persisted() {
        if (!this.persistedValue) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The persisted preferences are not available.');
        }
        return this.persistedValue;
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
    async mutate(mutation) {
        await this.initialize();
        let result;
        const previous = this.mutation;
        const next = previous.catch(()=>undefined).then(async ()=>{
            const current = this.persisted;
            const updated = mutation(current);
            if (updated === current) {
                return;
            }
            await this.store.write(this.runtime.current.settingsPath, updated);
            this.persistedValue = updated;
            result = updated;
        });
        this.mutation = next;
        await next;
        return result;
    }
    async load() {
        const configuration = this.runtime.current;
        const { buildEnvironment, settingsPath } = configuration;
        const persisted = await this.store.read(settingsPath, buildEnvironment);
        this.persistedValue = persisted;
    }
    constructor(){
        this.mutation = Promise.resolve();
    }
}
__decorate([
    inject(PreferencesRuntimeProvider),
    __metadata("design:type", typeof PreferencesRuntimeProvider === "undefined" ? Object : PreferencesRuntimeProvider)
], PreferencesState.prototype, "runtime", void 0);
__decorate([
    inject(PreferencesStore),
    __metadata("design:type", typeof PreferencesStore === "undefined" ? Object : PreferencesStore)
], PreferencesState.prototype, "store", void 0);
PreferencesState = __decorate([
    injectable()
], PreferencesState);
