// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/metrics/index.ts.
// The original TypeScript and import graph are not restored.






class SentryMetricsSink {
    push(points, environment) {
        if (points.length === 0) {
            return;
        }
        const scope = new Scope();
        scope.setClient(this.client.resolve(environment));
        for (const point of points){
            const record = public_api_namespaceObject[point.type === 'counter' ? 'count' : point.type];
            record(point.name, point.value, {
                attributes: point.attributes,
                scope,
                ...point.unit === undefined ? {} : {
                    unit: point.unit
                }
            });
        }
    }
}
__decorate([
    inject(LogsSentryClient),
    __metadata("design:type", typeof LogsSentryClient === "undefined" ? Object : LogsSentryClient)
], SentryMetricsSink.prototype, "client", void 0);
SentryMetricsSink = __decorate([
    injectable()
], SentryMetricsSink);
