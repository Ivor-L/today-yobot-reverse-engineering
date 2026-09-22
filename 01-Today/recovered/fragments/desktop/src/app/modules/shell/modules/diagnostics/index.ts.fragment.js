// Compiled fragment from ./src/app/modules/shell/modules/diagnostics/index.ts.
// The original TypeScript and import graph are not restored.






class ShellDiagnostics {
    async reportFault(id) {
        try {
            await this.nodeAdapter.sei.logs.push({
                id,
                issue: true,
                level: base_LogLevel.Error
            });
        } catch  {
        // An unavailable or disposed diagnostics target cannot interfere with window recovery.
        }
    }
    record(id, payload = {}) {
        let result;
        try {
            result = this.nodeAdapter.sei.logs.push({
                id,
                level: base_LogLevel.Info,
                payload,
                target: (/* inlined export .PushTarget.File */"file")
            });
        } catch  {
            // Adapter 尚未就绪或已释放时，跳过本条记录。
            return;
        }
        result.catch(()=>{
        // 日志目标写入失败不影响调用方。
        });
    }
}
__decorate([
    inject(ClientNodeAdapter),
    __metadata("design:type", typeof ClientNodeAdapter === "undefined" ? Object : ClientNodeAdapter)
], ShellDiagnostics.prototype, "nodeAdapter", void 0);
ShellDiagnostics = __decorate([
    injectable()
], ShellDiagnostics);
