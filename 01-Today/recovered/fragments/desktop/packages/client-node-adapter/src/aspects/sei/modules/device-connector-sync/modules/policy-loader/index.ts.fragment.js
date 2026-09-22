// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/policy-loader/index.ts.
// The original TypeScript and import graph are not restored.








class DeviceConnectorSyncPolicyLoader {
    async fetch(context) {
        const headers = await this.http.headers({
            bearerToken: context.accessToken,
            target: 'api'
        });
        let response;
        try {
            response = await globalThis.fetch(new URL(DEVICE_CONNECTOR_SYNC_CONFIG_PATH, context.apiBaseUrl), {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout((/* inlined export .DEVICE_CONNECTOR_SYNC_POLICY_TIMEOUT_MS */15000))
            });
        } catch  {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'policy fetch failed: transport');
            return {
                kind: 'unavailable'
            };
        }
        if (!response.ok) {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `policy fetch failed: http=${response.status}`);
            return {
                kind: 'unavailable'
            };
        }
        let payload;
        try {
            payload = await response.json();
        } catch  {
            // 2xx 但 body 解不开：可能是中间层截断，不能据此关掉同步。
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'policy decode failed');
            return {
                kind: 'unavailable'
            };
        }
        if (payload === null || typeof payload !== 'object') {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'policy response is not an object');
            return {
                kind: 'unavailable'
            };
        }
        const { policy, rejected } = parseDeviceConnectorSyncPolicy(payload.deviceConnectorSync);
        if (rejected.length > 0) {
            // 被丢的 capability 会「静默永不同步」，必须留一条 warning 供排查（只记 id，不记值）。
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `policy capabilities rejected as invalid: ${rejected.join(',')}`);
        }
        if (!policy) {
            this.logger.info(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, 'policy absent or invalid in /v1/config, sync stays disabled');
            return {
                kind: 'absent'
            };
        }
        return {
            kind: 'policy',
            policy
        };
    }
}
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], DeviceConnectorSyncPolicyLoader.prototype, "http", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncPolicyLoader.prototype, "logger", void 0);
DeviceConnectorSyncPolicyLoader = __decorate([
    injectable()
], DeviceConnectorSyncPolicyLoader);
