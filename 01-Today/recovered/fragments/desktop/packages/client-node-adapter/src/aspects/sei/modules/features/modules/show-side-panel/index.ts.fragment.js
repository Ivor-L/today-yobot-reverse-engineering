// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/features/modules/show-side-panel/index.ts.
// The original TypeScript and import graph are not restored.








class ShowSidePanelFeature extends FeatureShellItem {
    getInfo() {
        return Object.freeze({
            id: this.id,
            value: this.requestContext.surface !== (/* inlined export .ClientRuntimeSurface.QuickChat */"quick-chat")
        });
    }
    reset() {}
    setValue(_value) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'The side-panel capability cannot be overridden.');
    }
    subscribe(_listener) {
        return ()=>{};
    }
    getInitialEffectiveValue() {
        return true;
    }
    normalizeValue(value) {
        if (typeof value !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The side-panel capability requires a boolean value.');
        }
        return value;
    }
    constructor(...args){
        super(...args), this.id = (/* inlined export .WellKnownFeatureId.ShowSidePanel */"show-side-panel");
    }
}
__decorate([
    inject(CLIENT_NODE_WEB_REQUEST_CONTEXT),
    __metadata("design:type", typeof ClientNodeWebRequestContext === "undefined" ? Object : ClientNodeWebRequestContext)
], ShowSidePanelFeature.prototype, "requestContext", void 0);
ShowSidePanelFeature = __decorate([
    injectable()
], ShowSidePanelFeature);
