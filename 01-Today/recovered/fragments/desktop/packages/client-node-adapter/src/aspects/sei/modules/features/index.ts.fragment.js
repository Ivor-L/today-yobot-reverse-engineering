// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/features/index.ts.
// The original TypeScript and import graph are not restored.







class FeaturesShellService extends readonly_events_ReadonlyEvents {
    initializeRegistry() {
        for (const item of this.modules){
            if (!item.id.trim()) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'A registered feature must have a non-empty ID.');
            }
            if (this.items.has(item.id)) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, `Feature ID "${item.id}" is registered more than once.`);
            }
            this.items.set(item.id, item);
        }
        for (const item of this.modules){
            item.subscribe((info)=>{
                this.emit('changed', info);
            });
        }
    }
    async listFeatures() {
        return Object.freeze(this.modules.map((item)=>item.getInfo()));
    }
    async initialize() {
        await Promise.all(this.modules.map(async (item)=>await item.initialize()));
    }
    async dispose() {
        await Promise.all(this.modules.map(async (item)=>await item.dispose()));
    }
    async getFeature(params) {
        const { featureId } = params;
        return this.getItem(featureId).getInfo();
    }
    async setOverrideValue(params) {
        const { featureId, value } = params;
        await this.getItem(featureId).setValue(value);
    }
    async resetOverrides() {
        for (const item of this.modules){
            await item.reset();
        }
    }
    getItem(featureId) {
        const item = this.items.get(featureId);
        if (!item) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NotFound, 'The feature is not registered.');
        }
        return item;
    }
    constructor(...args){
        super(...args), this.items = new Map();
    }
}
__decorate([
    multiInject(FEATURE_SHELL_ITEM),
    __metadata("design:type", Object)
], FeaturesShellService.prototype, "modules", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FeaturesShellService.prototype, "initializeRegistry", null);
FeaturesShellService = __decorate([
    injectable()
], FeaturesShellService);
