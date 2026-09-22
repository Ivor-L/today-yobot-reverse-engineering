// Compiled fragment from ./src/app/modules/shell/modules/web-context/index.ts.
// The original TypeScript and import graph are not restored.









class ShellWebContext {
    get current() {
        const { apiBaseUrl, clientPlatform, webOrigin: configuredAccountOrigin } = this.nodeAdapter.sei.account.runtimeSnapshot;
        const { environment: environmentPreference, trafficLane: trafficLanePreference } = this.nodeAdapter.sei.preferences;
        const environment = environmentPreference.value;
        const trafficLane = trafficLanePreference.value;
        const canonicalWebOrigin = normalizeOrigin(configuredAccountOrigin);
        const localWebOrigin = this.configuration.current.launchOptions.localWebOrigin;
        const configuredOrigin = this.webRuntime.origin ?? localWebOrigin;
        if (!configuredOrigin) {
            throw new Error('The Desktop product Web surface requires a verified local Web origin.');
        }
        const webOrigin = normalizeOrigin(configuredOrigin);
        const webUrl = new URL((/* inlined export .TODAY_WEB_PATH */"/today"), `${webOrigin}/`).href;
        return {
            apiOrigin: normalizeOrigin(apiBaseUrl),
            canonicalWebOrigin,
            clientPlatform,
            environment,
            ...trafficLane ? {
                trafficLane
            } : {},
            webOrigin,
            webUrl
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellWebContext.prototype, "nodeAdapter", void 0);
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], ShellWebContext.prototype, "configuration", void 0);
__decorate([
    inject(DesktopWebRuntime),
    __metadata("design:type", typeof DesktopWebRuntime === "undefined" ? Object : DesktopWebRuntime)
], ShellWebContext.prototype, "webRuntime", void 0);
ShellWebContext = __decorate([
    injectable()
], ShellWebContext);
