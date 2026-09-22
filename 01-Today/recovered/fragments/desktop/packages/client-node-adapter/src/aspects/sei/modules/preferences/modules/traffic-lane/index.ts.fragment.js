// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/traffic-lane/index.ts.
// The original TypeScript and import graph are not restored.













class TrafficLanePreference extends PreferenceShellItem {
    get writable() {
        const configuration = this.runtime.current;
        return configuration.backendLane === undefined;
    }
    setValue(params) {
        const { value } = params;
        return this.setPreferenceValue(value);
    }
    async setPreferenceValue(value) {
        await this.prepareValueUpdate();
        if (value !== null && typeof value !== 'string') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The traffic lane preference is invalid.');
        }
        const lane = value?.trim() || undefined;
        if (lane && !TRAFFIC_LANE_PATTERN.test(lane)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The traffic lane preference is invalid.');
        }
        const environment = this.environment.value;
        const persisted = await this.state.mutate((current)=>{
            const trafficLanes = {
                ...current.trafficLanes
            };
            if (lane) {
                trafficLanes[environment] = lane;
            } else {
                delete trafficLanes[environment];
            }
            let updated = {
                environment: current.environment
            };
            if (!lodash_es_isEmpty(trafficLanes)) {
                updated = {
                    ...updated,
                    trafficLanes
                };
            }
            if (this.resolveTrafficLane(environment, current) === this.resolveTrafficLane(environment, updated)) {
                return current;
            }
            return updated;
        });
        if (!persisted) {
            return;
        }
        this.updateCurrentValue(this.resolveTrafficLane(environment, persisted) ?? null);
    }
    async loadValue() {
        await this.environment.initialize();
        await this.state.initialize();
        return this.resolveTrafficLane(this.environment.value, this.state.persisted) ?? null;
    }
    resolveTrafficLane(environment, persisted) {
        const configuration = this.runtime.current;
        const configured = configuration.backendLane ?? persisted.trafficLanes?.[environment];
        if (environment === base_RuntimeEnvironment.Staging) {
            return configured ?? 'staging';
        }
        return configured;
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .TRAFFIC_LANE_PREFERENCE_ID */"lane"), this.debugOnly = true;
    }
}
__decorate([
    inject(EnvironmentPreference),
    __metadata("design:type", typeof EnvironmentPreference === "undefined" ? Object : EnvironmentPreference)
], TrafficLanePreference.prototype, "environment", void 0);
__decorate([
    inject(PreferencesRuntimeProvider),
    __metadata("design:type", typeof PreferencesRuntimeProvider === "undefined" ? Object : PreferencesRuntimeProvider)
], TrafficLanePreference.prototype, "runtime", void 0);
__decorate([
    inject(PreferencesState),
    __metadata("design:type", typeof PreferencesState === "undefined" ? Object : PreferencesState)
], TrafficLanePreference.prototype, "state", void 0);
TrafficLanePreference = __decorate([
    injectable()
], TrafficLanePreference);
