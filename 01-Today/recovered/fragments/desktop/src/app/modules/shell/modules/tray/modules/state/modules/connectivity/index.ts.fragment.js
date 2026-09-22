// Compiled fragment from ./src/app/modules/shell/modules/tray/modules/state/modules/connectivity/index.ts.
// The original TypeScript and import graph are not restored.








class ShellTrayConnectivityState {
    get current() {
        return this.socketState.status === (/* inlined export .SocketStatus.Connected */"connected") && external_electron_.net.isOnline();
    }
    start(listener) {
        this.listener = listener;
        if (this.started) {
            this.publish();
            return;
        }
        this.started = true;
        this.startObservation();
        this.publish();
        this.networkStatusRefresh = setInterval(this.publish, (/* inlined export .NETWORK_STATUS_REFRESH_INTERVAL_MS */1000));
        this.networkStatusRefresh.unref();
    }
    destroy() {
        this.started = false;
        this.listener = undefined;
        if (this.networkStatusRefresh) {
            clearInterval(this.networkStatusRefresh);
            this.networkStatusRefresh = undefined;
        }
        const subscription = this.subscription;
        this.subscription = undefined;
        if (subscription) {
            this.release(subscription);
        }
    }
    async startObservation() {
        try {
            await this.observeSocket();
        } catch (error) {
            console.error('[desktop] failed to observe Socket status for the tray', error);
        }
    }
    async observeSocket() {
        const socket = this.nodeAdapter.sei.socket;
        const revision = this.socketStateRevision;
        const subscription = await socket.subscribe('stateChange', this.handleSocketStateChanged);
        if (!this.started) {
            await this.release(subscription);
            return;
        }
        this.subscription = subscription;
        const state = await socket.getSocketState();
        // A stateChange received during this read is newer than its initial snapshot.
        if (!this.started || this.subscription !== subscription || this.socketStateRevision !== revision) {
            return;
        }
        this.handleSocketStateChanged(state);
    }
    async release(subscription) {
        try {
            await subscription.unsubscribe();
        } catch  {
        // Subscription cleanup is best-effort during shell teardown.
        }
    }
    constructor(){
        this.socketState = {
            status: (/* inlined export .SocketStatus.Idle */"idle")
        };
        this.socketStateRevision = 0;
        this.started = false;
        this.handleSocketStateChanged = (state)=>{
            this.socketStateRevision += 1;
            this.socketState = state;
            this.publish();
        };
        this.publish = ()=>{
            this.listener?.();
        };
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellTrayConnectivityState.prototype, "nodeAdapter", void 0);
ShellTrayConnectivityState = __decorate([
    injectable()
], ShellTrayConnectivityState);
