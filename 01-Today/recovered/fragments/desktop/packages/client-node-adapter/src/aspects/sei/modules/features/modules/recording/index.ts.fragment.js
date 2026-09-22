// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/features/modules/recording/index.ts.
// The original TypeScript and import graph are not restored.








class RecordingFeature extends FeatureShellItem {
    async initialize() {
        const override = await this.store.read(this.id);
        if (override !== undefined) {
            super.setValue(override);
        }
    }
    async reset() {
        await this.mutations.run(async ()=>{
            await this.store.write(this.id, undefined);
            super.reset();
        });
    }
    async setValue(value) {
        const normalized = this.normalizeValue(value);
        await this.mutations.run(async ()=>{
            await this.store.write(this.id, normalized);
            super.setValue(normalized);
        });
    }
    getInitialEffectiveValue() {
        return false;
    }
    normalizeValue(value) {
        if (typeof value !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The recording capability requires a boolean value.');
        }
        return value;
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownFeatureId.Recording */"recording"), this.debug = {
            label: 'Recording'
        };
    }
}
__decorate([
    inject(FeatureOverridesStore),
    __metadata("design:type", typeof FeatureOverridesStore === "undefined" ? Object : FeatureOverridesStore)
], RecordingFeature.prototype, "store", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], RecordingFeature.prototype, "mutations", void 0);
RecordingFeature = __decorate([
    injectable()
], RecordingFeature);
