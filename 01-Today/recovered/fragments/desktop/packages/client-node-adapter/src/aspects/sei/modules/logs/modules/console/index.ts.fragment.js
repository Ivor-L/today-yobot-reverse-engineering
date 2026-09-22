// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/console/index.ts.
// The original TypeScript and import graph are not restored.







class ConsoleLogsPushTarget extends LogsPushTarget {
    async push(entry) {
        const message = JSON.stringify(entry);
        switch(entry.level){
            case base_LogLevel.Error:
                this.logger.error('logs', message);
                break;
            case base_LogLevel.Warning:
                this.logger.warn('logs', message);
                break;
            case base_LogLevel.Info:
                this.logger.info('logs', message);
                break;
            case base_LogLevel.Log:
                this.logger.debug('logs', message);
                break;
        }
    }
    constructor(...args){
        super(...args), this.target = (/* inlined export .PushTarget.Console */"console");
    }
}
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], ConsoleLogsPushTarget.prototype, "logger", void 0);
ConsoleLogsPushTarget = __decorate([
    injectable()
], ConsoleLogsPushTarget);
