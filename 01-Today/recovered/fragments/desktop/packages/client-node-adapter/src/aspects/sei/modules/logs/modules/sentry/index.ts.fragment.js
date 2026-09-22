// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/sentry/index.ts.
// The original TypeScript and import graph are not restored.










class SentryLogsPushTarget extends LogsPushTarget {
    async push(entry) {
        const client = this.client.resolve(entry.runtime_environment);
        const scope = new Scope();
        scope.setClient(client);
        if (entry.user_id) {
            scope.setUser({
                id: entry.user_id
            });
        }
        const log = logs_exports_namespaceObject[resolveSentryLogMethod(entry.level)];
        log(entry.id, toSentryLogAttributes(entry), {
            scope
        });
        if (entry.issue === true) {
            scope.captureEvent(toSentryIssueEvent(entry));
        }
        const flushed = await client.flush(5000);
        if (!flushed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.NetworkError, 'Sentry did not flush the log event.');
        }
    }
    dispose() {
        this.client.dispose();
    }
    constructor(...args){
        super(...args), this.target = (/* inlined export .PushTarget.Sentry */"sentry");
    }
}
__decorate([
    inject(LogsSentryClient),
    __metadata("design:type", typeof LogsSentryClient === "undefined" ? Object : LogsSentryClient)
], SentryLogsPushTarget.prototype, "client", void 0);
SentryLogsPushTarget = __decorate([
    injectable()
], SentryLogsPushTarget);
