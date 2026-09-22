// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/sentry/modules/client/index.ts.
// The original TypeScript and import graph are not restored.









class LogsSentryClient {
    resolve(environment) {
        const profile = this.config.sentry?.[environment];
        if (!profile || profile.dsn.trim().length === 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Sentry ingestion is not configured for the current environment.');
        }
        const key = `${environment}:${profile.dsn}`;
        const existing = this.clients.get(key);
        if (existing) {
            return existing;
        }
        const client = sdk_initWithoutDefaultIntegrations({
            dsn: profile.dsn,
            enableLogs: true,
            enableMetrics: true,
            environment: resolveSentryEnvironment(environment),
            includeServerName: false,
            release: this.config.appVersion,
            sendDefaultPii: false
        });
        if (!client) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Sentry could not be initialized.');
        }
        this.clients.set(key, client);
        return client;
    }
    dispose() {
        for (const client of this.clients.values()){
            this.closeClient(client);
        }
        this.clients.clear();
    }
    async closeClient(client) {
        try {
            await client.close(1000);
        } catch  {
        // Telemetry must never recursively report its own shutdown failure.
        }
    }
    constructor(){
        this.clients = new Map();
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], LogsSentryClient.prototype, "config", void 0);
LogsSentryClient = __decorate([
    injectable()
], LogsSentryClient);
