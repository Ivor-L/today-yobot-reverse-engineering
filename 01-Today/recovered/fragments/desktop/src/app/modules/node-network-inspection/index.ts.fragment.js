// Compiled fragment from ./src/app/modules/node-network-inspection/index.ts.
// The original TypeScript and import graph are not restored.










class DesktopNetworkInspector {
    get enabled() {
        return isNodeNetworkInspectionEnabled(process.execArgv, process.argv);
    }
    async prepare() {
        const active = this.enabled;
        const stored = await this.state.read();
        const override = resolveNodeNetworkInspectionRuntimeOverride(process.execArgv, process.argv);
        let desired = stored ?? this.defaultEnabled;
        if (typeof override === 'boolean') {
            desired = override;
        }
        if (desired !== active) {
            await this.requestRestart(desired);
            return false;
        }
        if (active) {
            this.compatibility.prepare();
        }
        return true;
    }
    async setEnabled(enabled) {
        const previous = await this.state.read();
        try {
            await this.state.write(enabled);
            await this.applicationRestart.restart({
                nodeNetworkInspectionEnabled: enabled
            });
        } catch (error) {
            await this.restoreState(previous);
            throw error;
        }
    }
    async reset() {
        await this.state.clear();
        await this.applicationRestart.restart({
            nodeNetworkInspectionEnabled: this.defaultEnabled
        });
    }
    dispose() {
        this.compatibility.dispose();
    }
    get defaultEnabled() {
        return this.configuration.current.launchOptions.isDevelopment && (/* inlined export .NODE_NETWORK_INSPECTION_DEFAULT_ENABLED */true);
    }
    async requestRestart(enabled) {
        await this.applicationRestart.restart({
            nodeNetworkInspectionEnabled: enabled
        });
    }
    async restoreState(previous) {
        try {
            if (typeof previous === 'boolean') {
                await this.state.write(previous);
                return;
            }
            await this.state.clear();
        } catch (error) {
            console.error('[desktop] failed to restore Node Network inspection state', error);
        }
    }
}
__decorate([
    inject(DesktopApplicationRestart),
    __metadata("design:type", typeof DesktopApplicationRestart === "undefined" ? Object : DesktopApplicationRestart)
], DesktopNetworkInspector.prototype, "applicationRestart", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopNetworkInspector.prototype, "configuration", void 0);
__decorate([
    inject(DesktopNetworkInspectionState),
    __metadata("design:type", typeof DesktopNetworkInspectionState === "undefined" ? Object : DesktopNetworkInspectionState)
], DesktopNetworkInspector.prototype, "state", void 0);
__decorate([
    inject(DesktopNetworkInspectorCompatibility),
    __metadata("design:type", typeof DesktopNetworkInspectorCompatibility === "undefined" ? Object : DesktopNetworkInspectorCompatibility)
], DesktopNetworkInspector.prototype, "compatibility", void 0);
DesktopNetworkInspector = __decorate([
    injectable()
], DesktopNetworkInspector);
