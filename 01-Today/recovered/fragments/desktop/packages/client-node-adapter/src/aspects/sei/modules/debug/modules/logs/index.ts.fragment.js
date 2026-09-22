// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/logs/index.ts.
// The original TypeScript and import graph are not restored.











class DebugLogsShellService {
    async listTargets() {
        this.assertSupported();
        return this.dispatcher.listTargets();
    }
    async listFileLogs(params) {
        this.assertSupported();
        this.assertTimeRange(params);
        try {
            return await this.fileReader.list(params);
        } catch  {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local debug log history is unavailable.');
        }
    }
    async subscribe(_eventName, listener) {
        this.assertSupported();
        const subscriptions = [];
        try {
            subscriptions.push(await this.dispatcher.subscribe('pushed', async ({ entry, target })=>{
                if (target === (/* inlined export .PushTarget.File */"file")) {
                    return;
                }
                const record = toDebugLogRecord(target, entry);
                if (record !== undefined) {
                    await listener(record);
                }
            }));
            subscriptions.push(await this.fileStore.subscribe('appended', async ({ serialized })=>{
                const record = parseDebugLogRecord((/* inlined export .PushTarget.File */"file"), serialized);
                if (record !== undefined) {
                    await listener(record);
                }
            }));
        } catch (error) {
            await this.unsubscribeAll(subscriptions);
            throw error;
        }
        return Object.freeze({
            unsubscribe: async ()=>{
                await this.unsubscribeAll(subscriptions);
            }
        });
    }
    async unsubscribeAll(subscriptions) {
        await Promise.allSettled(subscriptions.map(async (subscription)=>{
            await subscription.unsubscribe();
        }));
    }
    assertTimeRange(params) {
        if (!Number.isSafeInteger(params.fromAt) || !Number.isSafeInteger(params.toAt) || params.fromAt < 0 || params.fromAt >= params.toAt) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The debug log time range is invalid.');
        }
    }
    assertSupported() {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Log debugging is unavailable in this environment.');
        }
    }
}
__decorate([
    inject(DEBUG_CAPABLE),
    __metadata("design:type", Boolean)
], DebugLogsShellService.prototype, "debugCapable", void 0);
__decorate([
    inject(LogsDispatcher),
    __metadata("design:type", typeof LogsDispatcher === "undefined" ? Object : LogsDispatcher)
], DebugLogsShellService.prototype, "dispatcher", void 0);
__decorate([
    inject(FileLogStore),
    __metadata("design:type", typeof FileLogStore === "undefined" ? Object : FileLogStore)
], DebugLogsShellService.prototype, "fileStore", void 0);
__decorate([
    inject(DebugFileLogReader),
    __metadata("design:type", typeof DebugFileLogReader === "undefined" ? Object : DebugFileLogReader)
], DebugLogsShellService.prototype, "fileReader", void 0);
DebugLogsShellService = __decorate([
    injectable()
], DebugLogsShellService);
