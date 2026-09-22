// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/tools/modules/calls/index.ts.
// The original TypeScript and import graph are not restored.






class DebugToolCalls {
    initializeAccountScope(state) {
        if (state.status === 'signed-in') {
            this.accountScope = JSON.stringify([
                state.status,
                state.accountId,
                state.environment,
                state.sessionEpoch
            ]);
            return;
        }
        this.accountScope = JSON.stringify([
            state.status,
            undefined,
            undefined,
            state.sessionEpoch
        ]);
    }
    clear() {
        this.calls.clear();
        this.starts.clear();
        this.tasks.clear();
        this.invocations.clear();
        this.earlyTasks.clear();
        this.accountScope = undefined;
    }
    observe(record) {
        const packet = record.payload;
        const at = Date.parse(record.timestamp);
        if (!isDebugToolObject(packet) || !Number.isFinite(at)) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        if (record.interfaceKind === (/* inlined export .InterfaceKind.CrossPlatform */"CPI")) {
            return this.observeLocal(record.direction, packet, at);
        }
        if (record.interfaceKind === (/* inlined export .InterfaceKind.NativeExtended */"NEI")) {
            return this.observeRemote(record.direction, packet, at);
        }
        return {
            records: [],
            readTaskIds: []
        };
    }
    recordDenied(denial) {
        if (denial.invocationId && this.invocations.has(denial.invocationId)) {
            return undefined;
        }
        const call = this.createCall(denial.source, denial.toolId, denial.input, denial.startedAt, denial.invocationId);
        if (denial.invocationId) {
            this.invocations.set(denial.invocationId, call.id);
        }
        return this.save({
            ...call,
            state: base_ToolTaskState.Failed,
            finishedAt: denial.startedAt,
            error: snapshotDebugToolValue(denial.error).value
        });
    }
    hasTask(taskId) {
        return this.tasks.has(taskId);
    }
    getTaskCallId(taskId) {
        return this.tasks.get(taskId);
    }
    completeTask(taskId, callId, info) {
        const id = this.tasks.get(taskId);
        const call = id === undefined ? undefined : this.calls.get(id);
        if (!call || call.id !== callId) {
            return undefined;
        }
        if (!info || info.taskId !== taskId || info.toolId !== call.toolId || info.state === base_ToolTaskState.Running) {
            return this.save({
                ...call,
                resultUnavailable: true
            });
        }
        const result = snapshotDebugToolValue(info.result);
        return this.save({
            ...call,
            state: info.state,
            startedAt: info.startedAt,
            ...info.finishedAt === undefined ? {} : {
                finishedAt: info.finishedAt
            },
            ...info.result === undefined ? {} : {
                result: result.value
            },
            ...info.result !== undefined && result.truncated ? {
                resultTruncated: true
            } : {},
            ...info.error === undefined ? {} : {
                error: snapshotDebugToolValue(info.error).value
            }
        });
    }
    observeLocal(direction, packet, at) {
        const key = debugToolRequestKey(packet.id);
        const params = packet.params;
        if (direction === (/* inlined export .DebugRpcDirection.Outgoing */"outgoing")) {
            if (packet.method === 'cpi.account.applyAccountState' && isDebugToolObject(params) && typeof params.status === 'string' && isDebugToolIdentifier(params.sessionEpoch)) {
                const scope = JSON.stringify([
                    params.status,
                    params.accountId,
                    params.environment,
                    params.sessionEpoch
                ]);
                if (scope === this.accountScope) {
                    return {
                        records: [],
                        readTaskIds: []
                    };
                }
                const records = [
                    ...this.calls.values()
                ].filter((call)=>call.state === base_ToolTaskState.Running).map((call)=>({
                        ...call,
                        state: 'interrupted',
                        finishedAt: at
                    }));
                this.clear();
                this.accountScope = scope;
                return {
                    records,
                    readTaskIds: [],
                    reset: true
                };
            }
            if (packet.method !== 'cpi.tools.startTask' || key === undefined || !isDebugToolObject(params) || !isDebugToolIdentifier(params.toolId) || !isDebugToolObject(params.input)) {
                return {
                    records: [],
                    readTaskIds: []
                };
            }
            const call = this.createCall('local', params.toolId, params.input, at);
            this.starts.set(key, call.id);
            return {
                records: [
                    call
                ],
                readTaskIds: []
            };
        }
        if (packet.method === 'cpi.tools.taskChanged') {
            const summary = readDebugToolTaskSummary(params);
            if (!summary) {
                return {
                    records: [],
                    readTaskIds: []
                };
            }
            const id = this.tasks.get(summary.taskId);
            if (id !== undefined) {
                return this.applySummary(id, summary);
            }
            // Native may publish both running and terminal states before startTask responds.
            if (this.starts.size > 0) {
                this.earlyTasks.set(summary.taskId, summary);
                while(this.earlyTasks.size > (/* inlined export .MAX_DEBUG_TOOL_CALLS */500)){
                    const oldest = this.earlyTasks.keys().next().value;
                    if (oldest === undefined) {
                        break;
                    }
                    this.earlyTasks.delete(oldest);
                }
            }
            return {
                records: [],
                readTaskIds: []
            };
        }
        const id = key === undefined ? undefined : this.starts.get(key);
        const call = id === undefined ? undefined : this.calls.get(id);
        if (!call || key === undefined || packet.method !== undefined) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        this.starts.delete(key);
        if (packet.error !== undefined) {
            return {
                records: [
                    this.save({
                        ...call,
                        state: base_ToolTaskState.Failed,
                        finishedAt: at,
                        error: snapshotDebugToolValue(packet.error).value
                    })
                ],
                readTaskIds: []
            };
        }
        if (!isDebugToolIdentifier(packet.result)) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        const taskId = packet.result;
        const next = this.save({
            ...call,
            taskId
        });
        this.tasks.set(taskId, call.id);
        const summary = this.earlyTasks.get(taskId);
        this.earlyTasks.delete(taskId);
        if (this.starts.size === 0) {
            this.earlyTasks.clear();
        }
        if (summary !== undefined) {
            return this.applySummary(call.id, summary);
        }
        return {
            records: [
                next
            ],
            readTaskIds: []
        };
    }
    applySummary(id, summary) {
        const call = this.calls.get(id);
        if (!call || call.toolId !== summary.toolId || call.state !== base_ToolTaskState.Running) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        const next = this.save({
            ...call,
            ...summary
        });
        if (summary.state === base_ToolTaskState.Running) {
            return {
                records: [
                    next
                ],
                readTaskIds: []
            };
        }
        return {
            records: [
                next
            ],
            readTaskIds: [
                summary.taskId
            ]
        };
    }
    observeRemote(direction, packet, at) {
        const params = packet.params;
        if (!isDebugToolObject(params) || !isDebugToolIdentifier(params.invocationId)) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        const id = this.invocations.get(params.invocationId);
        const call = id === undefined ? undefined : this.calls.get(id);
        if (direction === (/* inlined export .DebugRpcDirection.Outgoing */"outgoing") && packet.method === 'nei.tools.invocationRequested' && isDebugToolIdentifier(params.capabilityId) && params.arguments !== undefined) {
            if (call) {
                return {
                    records: [],
                    readTaskIds: []
                };
            }
            const next = this.createCall('remote', params.capabilityId, params.arguments, at, params.invocationId);
            this.invocations.set(params.invocationId, next.id);
            return {
                records: [
                    next
                ],
                readTaskIds: []
            };
        }
        if (!call || call.state !== base_ToolTaskState.Running) {
            return {
                records: [],
                readTaskIds: []
            };
        }
        if (direction === (/* inlined export .DebugRpcDirection.Outgoing */"outgoing") && packet.method === 'nei.tools.invocationCancelled') {
            return {
                records: [
                    this.save({
                        ...call,
                        cancelRequested: true
                    })
                ],
                readTaskIds: []
            };
        }
        if (direction !== (/* inlined export .DebugRpcDirection.Incoming */"incoming") || packet.method !== 'nei.tools.completeInvocation' || typeof params.success !== 'boolean') {
            return {
                records: [],
                readTaskIds: []
            };
        }
        const result = snapshotDebugToolValue(params.data);
        let state = base_ToolTaskState.Succeeded;
        if (!params.success) {
            state = base_ToolTaskState.Failed;
            if (isDebugToolObject(params.error) && params.error.code === 'CANCELLED') {
                state = base_ToolTaskState.Cancelled;
            }
        }
        return {
            records: [
                this.save({
                    ...call,
                    state,
                    finishedAt: at,
                    ...params.data === undefined ? {} : {
                        result: result.value
                    },
                    ...params.data !== undefined && result.truncated ? {
                        resultTruncated: true
                    } : {},
                    ...params.error === undefined ? {} : {
                        error: snapshotDebugToolValue(params.error).value
                    }
                })
            ],
            readTaskIds: []
        };
    }
    createCall(source, toolId, input, startedAt, invocationId) {
        this.sequence += 1;
        const snapshot = snapshotDebugToolValue(input);
        return this.save({
            id: `tool-call-${this.sequence}`,
            source,
            toolId,
            input: snapshot.value,
            ...snapshot.truncated ? {
                inputTruncated: true
            } : {},
            state: base_ToolTaskState.Running,
            startedAt,
            ...invocationId === undefined ? {} : {
                invocationId
            }
        });
    }
    save(call) {
        this.calls.set(call.id, call);
        while(this.calls.size > (/* inlined export .MAX_DEBUG_TOOL_CALLS */500)){
            const id = this.calls.keys().next().value;
            if (id === undefined) {
                break;
            }
            this.calls.delete(id);
            for (const index of [
                this.starts,
                this.tasks,
                this.invocations
            ]){
                for (const [key, callId] of index){
                    if (callId === id) {
                        index.delete(key);
                    }
                }
            }
        }
        return call;
    }
    constructor(){
        this.calls = new Map();
        this.starts = new Map();
        this.tasks = new Map();
        this.invocations = new Map();
        this.earlyTasks = new Map();
        this.sequence = 0;
    }
}
DebugToolCalls = __decorate([
    injectable()
], DebugToolCalls);
