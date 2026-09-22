// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tools/index.ts.
// The original TypeScript and import graph are not restored.











class ToolsShellService {
    /**
   * 连接选择提交并同步到工具目录之后的 Node 内通知（不进 SEI 契约）。服务端按设备已发布的 connector
   * 判定 device-connector capability 是否启用，Device Connector Sync 用它在连接变化时立刻重跑并解除冷却。
   */ subscribeAuthorizationChanged(listener) {
        this.authorizationChanges.on('changed', listener);
        return {
            unsubscribe: async ()=>{
                this.authorizationChanges.off('changed', listener);
            }
        };
    }
    getAuthorization() {
        this.pruneTaskAuthorizations();
        return this.authorization.getAuthorization();
    }
    scanFileInventory() {
        return this.inventory.scanFileInventory();
    }
    uploadFileInventory() {
        return this.inventory.uploadFileInventory();
    }
    async setAuthorization(params) {
        const scope = this.authorization.currentScope;
        if (!scope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before changing local connector access.');
        }
        this.inventory.authorizationChanging();
        try {
            await this.authorizationTasks.run(async ()=>{
                this.authorization.assertCurrentScope(scope);
                await this.cpi.tools.listTools();
                this.authorization.assertCurrentScope(scope);
                const previous = await this.authorization.getEffectiveAuthorization(scope);
                await this.authorization.setAuthorization(params, scope);
                if (!params.committed) {
                    return;
                }
                const rootsRevoked = previous.fileRoots.some((root)=>!params.fileRoots.includes(root));
                let cancellationError;
                try {
                    const running = await this.cpi.tools.getRunningTasks();
                    for (const task of running){
                        if (!this.authorization.isAuthorized(task.toolId) || rootsRevoked && task.toolId.startsWith('fs.')) {
                            await this.cpi.tools.cancelTask({
                                taskId: task.taskId
                            });
                        }
                    }
                } catch (error) {
                    cancellationError = error;
                }
                this.authorization.assertCurrentScope(scope);
                // 本地选择已落盘，就是权威状态；socket 没连上不算失败，连上后自动补同步。
                await this.socket.syncToolCatalog({
                    force: true,
                    requireServerAck: false
                });
                this.authorization.assertCurrentScope(scope);
                this.authorizationChanges.emit('changed', await this.authorization.getAuthorization(scope));
                if (cancellationError) {
                    throw interface_error_InterfaceError(cancellationError, 'A revoked local tool task could not be cancelled.');
                }
                this.authorization.resetDebugAfterAuthorization(scope);
            });
        } finally{
            this.inventory.authorizationSettled();
        }
    }
    subscribe(eventName, listener) {
        return this.cpi.tools.subscribe(eventName, listener);
    }
    listTools() {
        return this.cpi.tools.listTools();
    }
    getToolInfo(params) {
        const { toolId } = params;
        return this.cpi.tools.getToolInfo({
            toolId
        });
    }
    getRunningTasks() {
        return this.cpi.tools.getRunningTasks();
    }
    async getTaskInfo(params) {
        const { taskId } = params;
        const scope = this.authorization.currentScope;
        this.pruneTaskAuthorizations();
        const task = await this.cpi.tools.getTaskInfo({
            taskId
        });
        // Status-only polling remains available so cancellation can reach a terminal state.
        if (task.result === undefined) {
            return task;
        }
        const evidence = this.taskAuthorizations.get(taskId);
        let allowed = false;
        if (scope && evidence && evidence.toolId === task.toolId) {
            this.authorization.assertCurrentScope(evidence.scope);
            allowed = await this.authorization.isInvocationAuthorized(task.toolId, evidence.input);
        }
        this.authorization.assertDebugInvocationAllowed(task.toolId);
        if (!scope || !allowed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local tool result is outside the current connector access.');
        }
        this.authorization.assertCurrentScope(scope);
        return task;
    }
    cancelTask(params) {
        const { taskId } = params;
        return this.cpi.tools.cancelTask({
            taskId
        });
    }
    async startTask(params) {
        const { input, timeoutMs, toolId } = params;
        const scope = this.authorization.currentScope;
        this.pruneTaskAuthorizations();
        const allowed = scope && await this.authorization.isInvocationAuthorized(toolId, input);
        this.authorization.assertDebugInvocationAllowed(toolId, {
            input,
            source: 'local'
        });
        if (!allowed || !scope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local connector has not been allowed.');
        }
        this.authorization.assertCurrentScope(scope);
        const evidence = {
            input: structuredClone(input),
            toolId,
            scope
        };
        const taskId = await this.cpi.tools.startTask({
            input,
            ...timeoutMs === undefined ? {} : {
                timeoutMs
            },
            toolId
        });
        this.authorization.assertCurrentScope(scope);
        this.taskAuthorizations.set(taskId, evidence);
        return taskId;
    }
    pruneTaskAuthorizations() {
        for (const [taskId, evidence] of this.taskAuthorizations){
            try {
                this.authorization.assertCurrentScope(evidence.scope);
            } catch  {
                this.taskAuthorizations.delete(taskId);
            }
        }
    }
    constructor(){
        this.taskAuthorizations = new Map();
        this.authorizationChanges = new node_modules_eventemitter3();
    }
}
__decorate([
    inject(ToolFileInventory),
    __metadata("design:type", typeof ToolFileInventory === "undefined" ? Object : ToolFileInventory)
], ToolsShellService.prototype, "inventory", void 0);
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ToolsShellService.prototype, "cpi", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], ToolsShellService.prototype, "authorization", void 0);
__decorate([
    inject(SocketShellService),
    __metadata("design:type", typeof SocketShellService === "undefined" ? Object : SocketShellService)
], ToolsShellService.prototype, "socket", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], ToolsShellService.prototype, "authorizationTasks", void 0);
ToolsShellService = __decorate([
    injectable()
], ToolsShellService);
