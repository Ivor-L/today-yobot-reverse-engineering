// Compiled fragment from ../../packages/client-node-adapter/src/decorators/rpc-call-logger/modules/reporter/index.ts.
// The original TypeScript and import graph are not restored.











class RpcCallReporter {
    register(root, interfaceKind) {
        this.registerNode(root, interfaceKind, [], new WeakSet());
    }
    recordMethod(record) {
        try {
            const context = this.contexts.get(record.instance);
            if (context === undefined) {
                return;
            }
            const common = {
                interface_type: context.interfaceKind,
                type: 'method',
                name: `${context.moduleName}.${record.methodName}`,
                status: record.status,
                started_at: record.startedAt,
                duration_ms: record.durationMs,
                request: record.request
            };
            if (record.status === 'failure') {
                common.code = interface_error_InterfaceError(record.error, 'The RPC call failed.').code;
            }
            const detailed = {
                ...common
            };
            if (record.response !== undefined) {
                detailed.response = record.response;
            }
            this.push({
                id: RPC_CALL_LOG_ID,
                level: record.status === 'success' ? base_LogLevel.Log : base_LogLevel.Error,
                compactPayload: common,
                detailedPayload: detailed,
                target: record.target
            });
        } catch  {
        // RPC diagnostics must never alter the decorated call.
        }
    }
    recordEvent(record) {
        try {
            const context = this.contexts.get(record.instance);
            if (context === undefined) {
                return;
            }
            const common = {
                interface_type: context.interfaceKind,
                type: 'event',
                name: `${context.moduleName}.${record.eventName}`,
                status: 'published',
                started_at: record.timestamp,
                duration_ms: 0
            };
            const detailed = {
                ...common,
                data: record.data
            };
            this.push({
                id: RPC_EVENT_LOG_ID,
                level: base_LogLevel.Log,
                compactPayload: common,
                detailedPayload: detailed,
                target: record.target
            });
        } catch  {
        // RPC diagnostics must never alter event delivery.
        }
    }
    async subscribe(subscription) {
        return await subscription.subscribe((data)=>{
            this.recordEvent({
                instance: subscription.instance,
                eventName: subscription.eventName,
                target: subscription.target,
                data: createRpcSnapshot(data),
                timestamp: Date.now()
            });
            return subscription.listener(data);
        });
    }
    registerNode(node, interfaceKind, path, visited) {
        if (visited.has(node)) {
            return;
        }
        visited.add(node);
        if (isRpcLoggedInstance(node)) {
            if (path.length === 0) {
                throw new Error('A logged RPC service must have a module path.');
            }
            this.contexts.set(node, {
                interfaceKind,
                moduleName: path.join('.')
            });
            return;
        }
        for (const [propertyName, child] of Object.entries(node)){
            if (typeof child !== 'object' && typeof child !== 'function' || child === null) {
                continue;
            }
            this.registerNode(child, interfaceKind, [
                ...path,
                propertyName
            ], visited);
        }
    }
    async push(params) {
        try {
            const { target } = params;
            if (target === RPC_LOG_TARGET_NOOP) {
                return;
            }
            const targetNames = this.resolveTargetNames(target);
            const compactEntry = this.logsContext.enrich('node', {
                id: params.id,
                level: params.level,
                payload: params.compactPayload
            });
            const detailedEntry = Object.freeze({
                ...compactEntry,
                payload: params.detailedPayload
            });
            await this.logsDispatcher.dispatch(targetNames, (targetName)=>{
                if (targetName === (/* inlined export .PushTarget.File */"file")) {
                    return detailedEntry;
                }
                return compactEntry;
            });
        } catch  {
        // Logs failures must not recursively report or affect RPC behavior.
        }
    }
    resolveTargetNames(target) {
        const targetNames = new Set([
            (/* inlined export .PushTarget.Console */"console"),
            (/* inlined export .PushTarget.File */"file")
        ]);
        if (typeof target === 'string') {
            targetNames.add(target);
            return targetNames;
        }
        if (target === undefined) {
            return targetNames;
        }
        for (const targetName of target){
            targetNames.add(targetName);
        }
        return targetNames;
    }
    constructor(){
        this.contexts = new WeakMap();
    }
}
__decorate([
    inject(LogsContext),
    __metadata("design:type", typeof LogsContext === "undefined" ? Object : LogsContext)
], RpcCallReporter.prototype, "logsContext", void 0);
__decorate([
    inject(LogsDispatcher),
    __metadata("design:type", typeof LogsDispatcher === "undefined" ? Object : LogsDispatcher)
], RpcCallReporter.prototype, "logsDispatcher", void 0);
RpcCallReporter = __decorate([
    injectable()
], RpcCallReporter);
