// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/rpc/index.ts.
// The original TypeScript and import graph are not restored.









class DebugRpcShellService extends readonly_events_ReadonlyEvents {
    async subscribe(eventName, listener) {
        this.assertSupported();
        const consumerSubscription = await super.subscribe(eventName, (event)=>{
            deliverSafely(listener, event);
        });
        this.consumerCount += 1;
        try {
            await this.synchronizeManagerSubscription();
        } catch (error) {
            this.consumerCount -= 1;
            await consumerSubscription.unsubscribe();
            throw error;
        }
        let subscribed = true;
        const subscription = {
            unsubscribe: async ()=>{
                if (!subscribed) {
                    return;
                }
                subscribed = false;
                try {
                    await consumerSubscription.unsubscribe();
                } finally{
                    this.consumerCount -= 1;
                    await this.synchronizeManagerSubscription();
                }
            }
        };
        return subscription;
    }
    synchronizeManagerSubscription() {
        const previousOperation = this.lifecycle;
        const operation = this.runManagerSynchronization(previousOperation);
        this.lifecycle = this.settleManagerSynchronization(operation);
        return operation;
    }
    async runManagerSynchronization(previousOperation) {
        await previousOperation;
        if (this.consumerCount > 0 && !this.managerSubscription) {
            this.managerSubscription = await this.manager.subscribe('traffic', (record)=>{
                this.emit('recorded', record);
            });
            return;
        }
        if (this.consumerCount === 0 && this.managerSubscription) {
            const subscription = this.managerSubscription;
            this.managerSubscription = undefined;
            await subscription.unsubscribe();
        }
    }
    async settleManagerSynchronization(operation) {
        try {
            await operation;
        } catch  {
        // A failed operation must not break serialization for the next subscriber.
        }
    }
    assertSupported() {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'RPC debugging is unavailable in this environment');
        }
    }
    constructor(...args){
        super(...args), this.lifecycle = Promise.resolve(), this.consumerCount = 0;
    }
}
__decorate([
    inject(DEBUG_CAPABLE),
    __metadata("design:type", Boolean)
], DebugRpcShellService.prototype, "debugCapable", void 0);
__decorate([
    inject(NodeAdapterPeerManager),
    __metadata("design:type", typeof NodeAdapterPeerManager === "undefined" ? Object : NodeAdapterPeerManager)
], DebugRpcShellService.prototype, "manager", void 0);
DebugRpcShellService = __decorate([
    injectable()
], DebugRpcShellService);
