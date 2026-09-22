// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/backend/index.ts.
// The original TypeScript and import graph are not restored.









class DeviceConnectorSyncBackend {
    async upload(body, context, signal, label) {
        const headers = await this.http.headers({
            bearerToken: context.accessToken,
            contentType: 'application/json',
            target: 'api'
        });
        headers.set('X-Device-Id', context.deviceId);
        // 与 iOS 的 session 拦截器同一组请求头；服务端本接口不读它，但契约示例里有，保持一致。
        headers.set('X-Timezone', currentTimeZone());
        const combined = AbortSignal.any([
            signal,
            AbortSignal.timeout((/* inlined export .DEVICE_CONNECTOR_SYNC_UPLOAD_TIMEOUT_MS */60000))
        ]);
        let response;
        let text;
        try {
            response = await globalThis.fetch(new URL(DEVICE_CONNECTOR_SYNC_UPLOAD_PATH, context.apiBaseUrl), {
                method: 'POST',
                headers,
                // `Buffer` / 共享 `ArrayBufferLike` 视图都不在 `BodyInit` 里；拷贝成独立 `ArrayBuffer`（≤ 5 MiB）。
                body: new Uint8Array(body),
                signal: combined
            });
            // 读 body 也在 deadline 内：响应头到达后连接仍可能断掉，那时结果同样未知。
            text = await response.text();
        } catch  {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} upload failed: transport`);
            return {
                kind: 'retryable'
            };
        }
        const envelope = utils_parseEnvelope(text);
        if (response.ok) {
            if (!envelope) {
                // 2xx 但 body 不是合法 envelope：服务端可能已处理，也可能是中间层截断，按结果未知重发同一 body。
                this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} upload got 2xx without envelope`);
                return {
                    kind: 'retryable'
                };
            }
            if (!envelope.success) {
                this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} upload rejected by envelope: code=${envelope.code}`);
                return {
                    kind: 'rejected',
                    httpStatus: response.status,
                    code: envelope.code
                };
            }
            return {
                kind: 'accepted',
                counts: envelope.counts
            };
        }
        const code = envelope?.code ?? `http.${response.status}`;
        // 408 / 429 / 5xx：结果未知或服务端暂时不可用，保留 body 逐字节重发。
        if (response.status >= 500 || response.status === 408 || response.status === 429) {
            this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} upload retryable: http=${response.status} code=${code}`);
            return {
                kind: 'retryable'
            };
        }
        this.logger.warn(DEVICE_CONNECTOR_SYNC_LOG_CATEGORY, `${label} upload rejected: http=${response.status} code=${code}`);
        return {
            kind: 'rejected',
            httpStatus: response.status,
            code
        };
    }
}
__decorate([
    inject(AccountHttpClient),
    __metadata("design:type", typeof AccountHttpClient === "undefined" ? Object : AccountHttpClient)
], DeviceConnectorSyncBackend.prototype, "http", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], DeviceConnectorSyncBackend.prototype, "logger", void 0);
DeviceConnectorSyncBackend = __decorate([
    injectable()
], DeviceConnectorSyncBackend);
