// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/posthog/index.ts.
// The original TypeScript and import graph are not restored.










class PostHogLogsPushTarget extends LogsPushTarget {
    async push(entry) {
        const distinctId = entry.device_id ?? entry.user_id;
        if (!distinctId) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'A stable identity is required to push logs to PostHog.');
        }
        const client = this.resolveClient(entry);
        await client.captureImmediate({
            distinctId,
            event: entry.id,
            properties: toPostHogProperties(entry),
            ...toPostHogEventMetadata(entry)
        });
    }
    dispose() {
        for (const client of this.clients.values()){
            this.shutdownClient(client);
        }
        this.clients.clear();
    }
    async shutdownClient(client) {
        try {
            // posthog-node currently declares this as void but returns a Promise at runtime.
            await client.shutdown(1000);
        } catch  {
        // Logs targets must never recursively report their own shutdown failure.
        }
    }
    resolveClient(entry) {
        const profile = this.config.postHog?.[entry.runtime_environment];
        if (!profile || profile.projectToken.trim().length === 0 || profile.host.trim().length === 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'PostHog log ingestion is not configured for the current environment.');
        }
        const key = `${entry.runtime_environment}:${profile.projectToken}:${profile.host}`;
        const existing = this.clients.get(key);
        if (existing) {
            return existing;
        }
        const client = new PostHog(profile.projectToken, {
            host: profile.host,
            enableExceptionAutocapture: false,
            enableLocalEvaluation: false
        });
        this.clients.set(key, client);
        return client;
    }
    constructor(...args){
        super(...args), this.target = (/* inlined export .PushTarget.PostHog */"posthog"), this.clients = new Map();
    }
}
__decorate([
    inject(CLIENT_NODE_LOGS_CONFIG),
    __metadata("design:type", typeof ClientNodeLogsConfig === "undefined" ? Object : ClientNodeLogsConfig)
], PostHogLogsPushTarget.prototype, "config", void 0);
PostHogLogsPushTarget = __decorate([
    injectable()
], PostHogLogsPushTarget);
