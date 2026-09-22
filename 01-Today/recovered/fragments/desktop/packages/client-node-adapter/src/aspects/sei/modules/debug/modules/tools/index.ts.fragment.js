// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/tools/index.ts.
// The original TypeScript and import graph are not restored.











class DebugToolsShellService extends readonly_events_ReadonlyEvents {
    getPermissions() {
        return this.authorization.getDebugPermissions();
    }
    setPermissions(params) {
        return this.authorization.setDebugPermissions(params);
    }
    setRejectionCode(params) {
        return this.authorization.setDebugPermissionRejectionCode(params);
    }
    setMode(params) {
        return this.authorization.setDebugMode(params);
    }
    resetPermissions(params) {
        return this.authorization.resetDebugPermissions(params);
    }
    async subscribe(eventName, listener) {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Tool debugging is unavailable in this environment.');
        }
        const consumer = await super.subscribe(eventName, (record)=>listener(structuredClone(record)));
        this.consumerCount += 1;
        try {
            await this.lifecycle.run(async ()=>await this.synchronizeSubscription());
        } catch (error) {
            this.consumerCount -= 1;
            await consumer.unsubscribe();
            throw error;
        }
        let subscribed = true;
        return {
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                await consumer.unsubscribe();
                this.consumerCount -= 1;
                await this.lifecycle.run(async ()=>await this.synchronizeSubscription());
            }
        };
    }
    async synchronizeSubscription() {
        if (this.consumerCount > 0 && !this.rpcSubscription) {
            const scope = this.authorization.currentScope;
            if (scope) {
                this.calls.initializeAccountScope({
                    status: (/* inlined export .NativeAccountStatus.SignedIn */"signed-in"),
                    accountId: scope.accountId,
                    environment: scope.environment,
                    sessionEpoch: String(scope.sessionGeneration)
                });
            }
            this.denialSubscription = await this.authorization.subscribeDebugDenied((denial)=>{
                const record = this.calls.recordDenied(denial);
                if (record) {
                    this.emit('recorded', record);
                }
            });
            try {
                this.rpcSubscription = await this.rpc.subscribe('recorded', (record)=>{
                    this.observe(record);
                });
            } catch (error) {
                await this.denialSubscription.unsubscribe();
                this.denialSubscription = undefined;
                throw error;
            }
            return;
        }
        if (this.consumerCount !== 0 || !this.rpcSubscription) {
            return;
        }
        const subscription = this.rpcSubscription;
        this.rpcSubscription = undefined;
        this.generation += 1;
        this.calls.clear();
        this.pendingTaskIds.clear();
        await subscription.unsubscribe();
        await this.denialSubscription?.unsubscribe();
        this.denialSubscription = undefined;
    }
    observe(record) {
        if (this.consumerCount === 0) {
            return;
        }
        try {
            const changes = this.calls.observe(record);
            if (changes.reset) {
                this.generation += 1;
                this.pendingTaskIds.clear();
            }
            for (const call of changes.records){
                this.emit('recorded', call);
            }
            for (const taskId of this.pendingTaskIds){
                if (!this.calls.hasTask(taskId)) {
                    this.pendingTaskIds.delete(taskId);
                }
            }
            for (const taskId of changes.readTaskIds){
                this.pendingTaskIds.add(taskId);
            }
            this.readTaskResults();
        } catch  {
        // Observation must never affect the RPC, task, or Native result delivery.
        }
    }
    async readTaskResults() {
        const generation = this.generation;
        if (this.readingGeneration === generation) {
            return;
        }
        this.readingGeneration = generation;
        try {
            while(generation === this.generation && this.pendingTaskIds.size > 0){
                const taskId = this.pendingTaskIds.values().next().value;
                if (taskId === undefined) {
                    return;
                }
                this.pendingTaskIds.delete(taskId);
                if (!this.calls.hasTask(taskId)) {
                    continue;
                }
                const callId = this.calls.getTaskCallId(taskId);
                let next;
                if (callId === undefined) {
                    continue;
                }
                try {
                    // Debug reads only tasks whose local start was observed; business authorization is unchanged.
                    const info = await this.readTaskInfo(taskId);
                    if (generation === this.generation) {
                        next = this.calls.completeTask(taskId, callId, info);
                    }
                } catch  {
                    if (generation === this.generation) {
                        next = this.calls.completeTask(taskId, callId);
                    }
                }
                if (next && this.consumerCount > 0) {
                    this.emit('recorded', next);
                }
            }
        } finally{
            if (this.readingGeneration === generation) {
                this.readingGeneration = undefined;
            }
        }
    }
    async readTaskInfo(taskId) {
        if (this.pendingReadCount >= (/* inlined export .MAX_DEBUG_TOOL_PENDING_READS */4)) {
            throw new Error('The debug tool result reader is at capacity.');
        }
        let timeout;
        try {
            return await Promise.race([
                this.requestTaskInfo(taskId),
                new Promise((_resolve, reject)=>{
                    timeout = setTimeout(()=>{
                        reject(new Error('The debug tool result read timed out.'));
                    }, (/* inlined export .DEBUG_TOOL_RESULT_READ_TIMEOUT_MS */5000));
                })
            ]);
        } finally{
            clearTimeout(timeout);
        }
    }
    async requestTaskInfo(taskId) {
        this.pendingReadCount += 1;
        try {
            return await this.cpi.tools.getTaskInfo({
                taskId
            });
        } finally{
            // A local deadline does not cancel the transport request or release its capacity.
            this.pendingReadCount -= 1;
        }
    }
    constructor(...args){
        super(...args), this.consumerCount = 0, this.generation = 0, this.pendingTaskIds = new Set(), this.pendingReadCount = 0;
    }
}
__decorate([
    inject(DEBUG_CAPABLE),
    __metadata("design:type", Boolean)
], DebugToolsShellService.prototype, "debugCapable", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], DebugToolsShellService.prototype, "cpi", void 0);
__decorate([
    inject(DebugRpcShellService),
    __metadata("design:type", typeof DebugRpcShellService === "undefined" ? Object : DebugRpcShellService)
], DebugToolsShellService.prototype, "rpc", void 0);
__decorate([
    inject(DebugToolCalls),
    __metadata("design:type", typeof DebugToolCalls === "undefined" ? Object : DebugToolCalls)
], DebugToolsShellService.prototype, "calls", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], DebugToolsShellService.prototype, "lifecycle", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], DebugToolsShellService.prototype, "authorization", void 0);
DebugToolsShellService = __decorate([
    injectable()
], DebugToolsShellService);
