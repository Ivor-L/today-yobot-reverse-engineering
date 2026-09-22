// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/index.ts.
// The original TypeScript and import graph are not restored.










class PreferencesShellService extends readonly_events_ReadonlyEvents {
    registerPreferences() {
        for (const preference of this.preferences){
            const { id } = preference;
            if (id.trim().length === 0) {
                throw new Error('The preference ID must not be empty.');
            }
            if (this.preferencesById.has(id)) {
                throw new Error(`The preference ID "${id}" is registered more than once.`);
            }
            this.preferencesById.set(id, preference);
            preference.subscribeChanged((info)=>{
                this.emit('changed', info);
            });
        }
    }
    configure(configuration) {
        this.runtime.configure(configuration);
    }
    get settingsPath() {
        return this.runtime.current.settingsPath;
    }
    async initialize() {
        await Promise.all(this.preferences.map((preference)=>preference.initialize()));
    }
    async listPreferences() {
        await this.initialize();
        return Object.freeze(this.preferences.map((preference)=>preference.getInfo()));
    }
    async setPreferenceValue(params) {
        const { preferenceId, value } = params;
        await this.initialize();
        const preference = this.preferencesById.get(preferenceId);
        if (!preference) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NotFound, 'The preference is not registered.');
        }
        await preference.setPreferenceValue(value);
    }
    constructor(...args){
        super(...args), this.preferencesById = new Map();
    }
}
__decorate([
    inject(PreferencesRuntimeProvider),
    __metadata("design:type", typeof PreferencesRuntimeProvider === "undefined" ? Object : PreferencesRuntimeProvider)
], PreferencesShellService.prototype, "runtime", void 0);
__decorate([
    multiInject(PREFERENCE_SHELL_ITEM),
    __metadata("design:type", Object)
], PreferencesShellService.prototype, "preferences", void 0);
__decorate([
    inject(EnvironmentPreference),
    __metadata("design:type", typeof EnvironmentPreference === "undefined" ? Object : EnvironmentPreference)
], PreferencesShellService.prototype, "environment", void 0);
__decorate([
    inject(TrafficLanePreference),
    __metadata("design:type", typeof TrafficLanePreference === "undefined" ? Object : TrafficLanePreference)
], PreferencesShellService.prototype, "trafficLane", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PreferencesShellService.prototype, "registerPreferences", null);
PreferencesShellService = __decorate([
    injectable()
], PreferencesShellService);
