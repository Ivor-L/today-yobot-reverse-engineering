// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/tool-catalog-sync/index.ts.
// The original TypeScript and import graph are not restored.











class SocketToolCatalogSync {
    invalidate() {
        this.invalidationEpoch += 1;
        this.lastAcknowledgedKey = null;
    }
    async sync(params) {
        try {
            await this.syncCurrent(params, this.invalidationEpoch);
        } catch (error) {
            // A failed replacement may already have changed the remote registry.
            this.lastAcknowledgedKey = null;
            throw error;
        }
    }
    async syncCurrent(params, invalidationEpoch) {
        const { accessToken, apiBaseUrl, appVersion, clientPlatform, deviceId, signal, trafficLane } = params;
        const registrations = await this.cpi.tools.listToolRegistrations();
        const catalog = await this.authorization.projectCatalog(registrations, params);
        const key = createToolCatalogSyncKey(params, catalog);
        catalog.assertCurrent();
        signal.throwIfAborted();
        if (invalidationEpoch === this.invalidationEpoch && this.lastAcknowledgedKey === key) {
            this.logger.debug(SOCKET_TOOL_CATALOG_LOG_CATEGORY, 'unchanged tool catalog already acknowledged on this connection; skipping PUT');
            return;
        }
        this.lastAcknowledgedKey = null;
        const tools = catalog.registrations.map(toManifestEntry);
        const headers = new Headers({
            'Accept-Language': await this.account.getRequestAcceptLanguage(),
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-App-Version': appVersion,
            'X-Client-Platform': clientPlatform,
            'X-Device-Id': deviceId
        });
        if (trafficLane) {
            headers.set('X-Traffic-Lane', trafficLane);
        }
        const endpoint = `${apiBaseUrl.replace(/\/+$/u, '')}/registry/devices/${encodeURIComponent(deviceId)}/tools`;
        let response;
        try {
            catalog.assertCurrent();
            response = await globalThis.fetch(endpoint, {
                body: JSON.stringify({
                    tools,
                    connectorSnapshot: catalog.connectorSnapshot
                }),
                headers,
                method: 'PUT',
                signal
            });
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The tool catalog sync could not reach the server.');
        }
        this.logger.info(SOCKET_TOOL_CATALOG_LOG_CATEGORY, `PUT /registry/devices/:deviceId/tools (${tools.length} tools) -> HTTP ${response.status}`);
        if (!response.ok) {
            throw interface_error_InterfaceError(response.status === 401 ? base_InterfaceErrorCode.AuthRequired : response.status === 404 ? base_InterfaceErrorCode.NotFound : base_InterfaceErrorCode.Unavailable, `The tool catalog sync failed with HTTP ${response.status}.`);
        }
        let acknowledgement;
        try {
            acknowledgement = await response.json();
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The tool catalog sync acknowledgement is invalid.');
        }
        if (!acknowledgement || typeof acknowledgement !== 'object' || !('success' in acknowledgement) || acknowledgement.success !== true) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The server did not acknowledge the tool catalog and connector snapshot.');
        }
        catalog.assertCurrent();
        await catalog.acknowledge();
        // A permission or connection change during the request requires a fresh upload.
        if (invalidationEpoch === this.invalidationEpoch) {
            this.lastAcknowledgedKey = key;
        }
    }
    constructor(){
        this.invalidationEpoch = 0;
        this.lastAcknowledgedKey = null;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], SocketToolCatalogSync.prototype, "cpi", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketToolCatalogSync.prototype, "logger", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], SocketToolCatalogSync.prototype, "authorization", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketToolCatalogSync.prototype, "account", void 0);
SocketToolCatalogSync = __decorate([
    injectable()
], SocketToolCatalogSync);
