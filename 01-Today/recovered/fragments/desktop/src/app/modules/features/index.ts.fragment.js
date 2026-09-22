// Compiled fragment from ./src/app/modules/features/index.ts.
// The original TypeScript and import graph are not restored.





class DesktopFeatures {
    get featureIds() {
        return this.supportedFeatureIds;
    }
    async prepare(supportedFeatureIds) {
        this.supportedFeatureIds = supportedFeatureIds;
    }
    async clear() {
        await this.state.clear();
    }
    constructor(){
        this.supportedFeatureIds = [];
    }
}
__decorate([
    inject(DesktopFeaturesState),
    __metadata("design:type", typeof DesktopFeaturesState === "undefined" ? Object : DesktopFeaturesState)
], DesktopFeatures.prototype, "state", void 0);
DesktopFeatures = __decorate([
    injectable()
], DesktopFeatures);
