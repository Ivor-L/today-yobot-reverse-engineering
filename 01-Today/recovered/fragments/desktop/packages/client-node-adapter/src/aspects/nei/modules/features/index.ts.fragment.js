// Compiled fragment from ../../packages/client-node-adapter/src/aspects/nei/modules/features/index.ts.
// The original TypeScript and import graph are not restored.







class FeaturesNativeService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    listFeatures() {
        return this.shell.listFeatures();
    }
    getFeature(params) {
        const { featureId } = params;
        return this.shell.getFeature({
            featureId
        });
    }
    setOverrideValue(params) {
        const { featureId, value } = params;
        return this.shell.setOverrideValue({
            featureId,
            value
        });
    }
    resetOverrides() {
        return this.shell.resetOverrides();
    }
}
__decorate([
    inject(FeaturesShellService),
    __metadata("design:type", typeof FeaturesShellService === "undefined" ? Object : FeaturesShellService)
], FeaturesNativeService.prototype, "shell", void 0);
FeaturesNativeService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], FeaturesNativeService);
