// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/dispatcher/index.ts.
// The original TypeScript and import graph are not restored.







class LogsDispatcher extends readonly_events_ReadonlyEvents {
    listTargets() {
        return Object.freeze([
            ...this.targetsByName.keys()
        ]);
    }
    registerTargets() {
        for (const target of this.targets){
            if (this.targetsByName.has(target.target)) {
                throw new Error(`The logs target "${target.target}" is registered more than once.`);
            }
            this.targetsByName.set(target.target, target);
        }
        if (!this.targetsByName.has((/* inlined export .PushTarget.Console */"console"))) {
            throw new Error('The console logs target must be registered.');
        }
        if (!this.targetsByName.has((/* inlined export .PushTarget.File */"file"))) {
            throw new Error('The file logs target must be registered.');
        }
    }
    async dispatch(targetNames, resolveEntry) {
        const results = await Promise.allSettled([
            ...targetNames
        ].map(async (targetName)=>{
            const target = this.targetsByName.get(targetName);
            if (target === undefined) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, `The logs target "${targetName}" is not supported.`);
            }
            try {
                const entry = resolveEntry(targetName);
                this.emit('pushed', {
                    entry,
                    target: targetName
                });
                await target.push(entry);
            } catch (error) {
                throw this.cleanError(error);
            }
        }));
        const failure = results.find((result)=>result.status === 'rejected');
        if (failure?.status === 'rejected') {
            throw failure.reason;
        }
    }
    cleanError(error) {
        const normalized = interface_error_InterfaceError(error, 'The logs target failed to push the event.');
        return interface_error_InterfaceError(normalized.code, normalized.message);
    }
    constructor(...args){
        super(...args), this.targetsByName = new Map();
    }
}
__decorate([
    multiInject(LOGS_PUSH_TARGET),
    __metadata("design:type", Object)
], LogsDispatcher.prototype, "targets", void 0);
__decorate([
    postConstruct(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LogsDispatcher.prototype, "registerTargets", null);
LogsDispatcher = __decorate([
    injectable()
], LogsDispatcher);
