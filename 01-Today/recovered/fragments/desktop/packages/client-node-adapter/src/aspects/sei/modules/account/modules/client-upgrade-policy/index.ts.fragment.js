// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/client-upgrade-policy/index.ts.
// The original TypeScript and import graph are not restored.










const CLIENT_UPGRADE_POLICY_LOG_CATEGORY = 'client-upgrade-policy';
const CLIENT_UPGRADE_POLICY_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
class ClientUpgradePolicySync {
    start() {
        if (this.interval) {
            return;
        }
        this.lifecycle += 1;
        const lifecycle = this.lifecycle;
        this.refresh(lifecycle);
        this.interval = setInterval(()=>{
            this.refresh(lifecycle);
        }, CLIENT_UPGRADE_POLICY_REFRESH_INTERVAL_MS);
    }
    stop() {
        if (!this.interval) {
            return;
        }
        clearInterval(this.interval);
        this.interval = undefined;
        this.lifecycle += 1;
    }
    refresh(lifecycle) {
        if (this.flight) {
            return;
        }
        const flight = this.performRefresh(lifecycle);
        this.flight = flight;
    }
    async performRefresh(lifecycle) {
        try {
            const apiFetch = async (input, init)=>await this.http.request(globalThis.fetch, input, init);
            const headers = await this.http.headers({
                target: 'api'
            });
            const client = createClient({
                baseUrl: this.config.current.apiBaseUrl,
                fetch: apiFetch,
                headers,
                redirect: 'error'
            });
            const result = await getV1ClientUpgrade({
                client
            });
            if (!result.response?.ok || !result.data) {
                throw new Error(`request rejected with status ${result.response?.status ?? 'none'}`);
            }
            const requirement = result.data.data.upgrade.required ? (/* inlined export .UpdateRequirement.Required */"required") : (/* inlined export .UpdateRequirement.Optional */"optional");
            if (this.lifecycle === lifecycle) {
                this.update.setRequirement(requirement);
            }
        } catch (error) {
            this.logger.warn(CLIENT_UPGRADE_POLICY_LOG_CATEGORY, `refresh failed: ${describeError(error)}`);
        } finally{
            this.flight = undefined;
            if (this.interval && this.lifecycle !== lifecycle) {
                this.refresh(this.lifecycle);
            }
        }
    }
    constructor(){
        this.lifecycle = 0;
    }
}
__decorate([
    inject(AccountConfig),
    __metadata("design:type", typeof AccountConfig === "undefined" ? Object : AccountConfig)
], ClientUpgradePolicySync.prototype, "config", void 0);
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], ClientUpgradePolicySync.prototype, "http", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], ClientUpgradePolicySync.prototype, "logger", void 0);
__decorate([
    inject(UpdateShellService),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], ClientUpgradePolicySync.prototype, "update", void 0);
ClientUpgradePolicySync = __decorate([
    injectable()
], ClientUpgradePolicySync);
