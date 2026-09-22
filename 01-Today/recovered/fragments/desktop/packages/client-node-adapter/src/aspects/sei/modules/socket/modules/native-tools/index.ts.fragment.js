// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/native-tools/index.ts.
// The original TypeScript and import graph are not restored.








class SocketNativeTools extends readonly_events_ReadonlyEvents {
    bind(client) {
        for (const [invocationId, invocation] of this.invocations){
            try {
                this.authorization.assertCurrentScope(invocation.scope);
            } catch  {
                this.invocations.delete(invocationId);
            }
        }
        this.client = client;
    }
    unbind(client) {
        if (this.client === client) {
            this.client = null;
            this.invocations.clear();
        }
    }
    async route(message) {
        switch(message['type']){
            case 'invocation.request':
                {
                    const invocationId = typeof message['invocationId'] === 'string' ? message['invocationId'].trim() : '';
                    if (!invocationId) {
                        return false;
                    }
                    const request = toNativeToolInvocationRequest(message);
                    if (!request) {
                        this.client?.sendInvocationResult?.({
                            error: {
                                code: 'INVALID_ARGS',
                                message: 'The remote tool invocation payload is invalid.'
                            },
                            invocationId,
                            success: false
                        });
                        return false;
                    }
                    const client = this.client;
                    const scope = this.authorization.currentScope;
                    const authorized = await this.authorization.isInvocationAuthorized(request.capabilityId, request.arguments);
                    if (client !== this.client) {
                        return false;
                    }
                    const debugDenial = this.getDebugDenial(request.capabilityId, {
                        source: 'remote',
                        input: request.arguments,
                        invocationId
                    });
                    if (!authorized || !scope || debugDenial) {
                        client?.sendInvocationResult?.({
                            invocationId: request.invocationId,
                            success: false,
                            error: debugDenial ?? {
                                code: 'CAPABILITY_DISABLED',
                                message: 'The user has not allowed this local connector.'
                            }
                        });
                        return false;
                    }
                    this.invocations.set(invocationId, {
                        request,
                        scope
                    });
                    if (!this.emit('invocationRequested', request)) {
                        this.invocations.delete(invocationId);
                        this.client?.sendInvocationResult?.({
                            error: {
                                code: 'EXECUTION_ERROR',
                                message: 'The Native tool executor is unavailable.'
                            },
                            invocationId,
                            success: false
                        });
                        return false;
                    }
                    this.client?.sendInvocationAck?.(invocationId);
                    return true;
                }
            case 'invocation.cancel':
                {
                    const cancellation = toNativeToolInvocationCancellation(message);
                    if (!cancellation || !this.emit('invocationCancelled', cancellation)) {
                        return false;
                    }
                    return true;
                }
            case 'cloud.pending_invocations':
                {
                    const request = toNativeToolPendingInvocationResultsRequest(message);
                    if (!request) {
                        return false;
                    }
                    const client = this.client;
                    const scope = this.authorization.currentScope;
                    const allowedInvocations = [];
                    for (const pending of request.invocations){
                        let tracked = this.invocations.get(pending.invocationId);
                        if (tracked) {
                            try {
                                this.authorization.assertCurrentScope(tracked.scope);
                            } catch  {
                                tracked = undefined;
                            }
                        }
                        const input = tracked?.request.arguments ?? {};
                        const allowed = scope && await this.authorization.isInvocationAuthorized(pending.capabilityId, input);
                        if (client !== this.client) {
                            return false;
                        }
                        const debugDenial = this.getDebugDenial(pending.capabilityId);
                        if (!allowed || !scope || debugDenial) {
                            client?.sendInvocationResult?.({
                                invocationId: pending.invocationId,
                                success: false,
                                error: debugDenial ?? {
                                    code: 'CAPABILITY_DISABLED',
                                    message: 'Local connector replay is outside the current consent.'
                                }
                            });
                            continue;
                        }
                        this.invocations.set(pending.invocationId, {
                            request: {
                                ...pending,
                                arguments: input
                            },
                            scope
                        });
                        allowedInvocations.push(pending);
                    }
                    // A later asynchronous check can outlive an earlier entry's debug permission decision.
                    const currentInvocations = allowedInvocations.filter((pending)=>{
                        let allowed = false;
                        let debugDenial;
                        try {
                            this.authorization.assertCurrentScope(scope);
                            allowed = this.authorization.isAuthorized(pending.capabilityId);
                            debugDenial = this.getDebugDenial(pending.capabilityId);
                        } catch  {}
                        if (allowed && !debugDenial) {
                            return true;
                        }
                        client?.sendInvocationResult?.({
                            invocationId: pending.invocationId,
                            success: false,
                            error: debugDenial ?? {
                                code: 'CAPABILITY_DISABLED',
                                message: 'Local connector replay is outside the current consent.'
                            }
                        });
                        return false;
                    });
                    if (!this.emit('pendingInvocationResultsRequested', {
                        invocations: currentInvocations
                    })) {
                        return false;
                    }
                    return true;
                }
            case 'cloud.result_ack':
                {
                    const acknowledgement = toNativeToolInvocationResultAcknowledgement(message);
                    if (!acknowledgement || !this.emit('invocationResultAcknowledged', acknowledgement)) {
                        return false;
                    }
                    this.invocations.delete(acknowledgement.invocationId);
                    return true;
                }
            default:
                return false;
        }
    }
    async completeInvocation(result) {
        if (result.success && result.error !== undefined || !result.success && !result.error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The remote tool invocation result is inconsistent.');
        }
        const client = this.client;
        const invocation = this.invocations.get(result.invocationId);
        let outgoing = result;
        let allowed = false;
        let debugDenial;
        if (invocation) {
            try {
                this.authorization.assertCurrentScope(invocation.scope);
                allowed = await this.authorization.isInvocationAuthorized(invocation.request.capabilityId, invocation.request.arguments);
                this.authorization.assertCurrentScope(invocation.scope);
                debugDenial = this.getDebugDenial(invocation.request.capabilityId);
            } catch  {}
        }
        if (!allowed || debugDenial) {
            outgoing = {
                invocationId: result.invocationId,
                success: false,
                error: debugDenial ?? {
                    code: 'CAPABILITY_DISABLED',
                    message: 'The user revoked access to this local connector.'
                }
            };
        }
        if (client !== this.client || !client?.sendInvocationResult?.(outgoing)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The unified Socket is unavailable for the remote tool result.');
        }
    }
    subscribeNative(eventName, listener) {
        return this.subscribe(eventName, listener);
    }
    getDebugDenial(toolId, context) {
        try {
            this.authorization.assertDebugInvocationAllowed(toolId, context);
            return undefined;
        } catch (error) {
            const failure = interface_error_InterfaceError(error);
            if (failure.code !== base_InterfaceErrorCode.PermissionRequired && failure.code !== base_InterfaceErrorCode.PermissionDenied) {
                throw error;
            }
            return {
                code: failure.code,
                message: failure.message,
                details: {
                    permissionId: failure.permissionId ?? `debug.tool.${toolId}`
                }
            };
        }
    }
    constructor(...args){
        super(...args), this.invocations = new Map(), this.client = null;
    }
}
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], SocketNativeTools.prototype, "authorization", void 0);
SocketNativeTools = __decorate([
    injectable()
], SocketNativeTools);
