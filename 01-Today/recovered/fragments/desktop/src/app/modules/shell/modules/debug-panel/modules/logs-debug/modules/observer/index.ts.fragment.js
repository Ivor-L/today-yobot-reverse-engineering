// Compiled fragment from ./src/app/modules/shell/modules/debug-panel/modules/logs-debug/modules/observer/index.ts.
// The original TypeScript and import graph are not restored.






class ShellLogsDebugObserver {
    async start() {
        this.requested = true;
        await this.runLifecycle(async ()=>{
            if (!this.requested || this.subscriptions.length > 0) {
                return;
            }
            this.subscriptions = await this.subscribe();
        });
    }
    async stop() {
        this.requested = false;
        await this.runLifecycle(async ()=>{
            const subscriptions = this.subscriptions;
            this.subscriptions = [];
            await this.unsubscribeAll(subscriptions);
        });
    }
    async subscribe() {
        const subscriptions = [];
        try {
            subscriptions.push(await this.adapter.sei.logs.subscribe('uploadStatusChanged', (status)=>{
                this.window.publish({
                    status,
                    type: 'uploadStatusChanged'
                });
            }));
            subscriptions.push(await this.adapter.sei.logs.subscribe('uploadProgressChanged', (progress)=>{
                this.window.publish({
                    progress,
                    type: 'uploadProgressChanged'
                });
            }));
            subscriptions.push(await this.adapter.sei.debug.logs.subscribe('recorded', (record)=>{
                this.window.publish({
                    record,
                    type: 'recorded'
                });
            }));
        } catch (error) {
            await this.unsubscribeAll(subscriptions);
            throw error;
        }
        return subscriptions;
    }
    async unsubscribeAll(subscriptions) {
        await Promise.allSettled(subscriptions.map(async (subscription)=>{
            await subscription.unsubscribe();
        }));
    }
    runLifecycle(task) {
        const result = this.runAfter(this.lifecycle, task);
        this.lifecycle = this.settle(result);
        return result;
    }
    async runAfter(previous, task) {
        try {
            await previous;
        } catch  {}
        await task();
    }
    async settle(task) {
        try {
            await task;
        } catch  {}
    }
    constructor(){
        this.subscriptions = [];
        this.lifecycle = Promise.resolve();
        this.requested = false;
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellLogsDebugObserver.prototype, "adapter", void 0);
__decorate([
    inject(ShellLogsDebugWindow),
    __metadata("design:type", typeof ShellLogsDebugWindow === "undefined" ? Object : ShellLogsDebugWindow)
], ShellLogsDebugObserver.prototype, "window", void 0);
ShellLogsDebugObserver = __decorate([
    injectable()
], ShellLogsDebugObserver);
