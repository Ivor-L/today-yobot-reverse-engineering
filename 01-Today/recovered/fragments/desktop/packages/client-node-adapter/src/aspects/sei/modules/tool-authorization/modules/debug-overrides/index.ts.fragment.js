// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/debug-overrides/index.ts.
// The original TypeScript and import graph are not restored.









class DebugToolPermissionOverrides extends readonly_events_ReadonlyEvents {
    resetAfterAuthorization(scope) {
        if (!this.debugCapable) {
            return;
        }
        this.synchronizeScope();
        if (this.scope !== this.scopeKey(scope) || this.overrides.size === 0) {
            return;
        }
        this.overrides.clear();
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    get(toolId) {
        if (!this.debugCapable) {
            return undefined;
        }
        this.synchronizeScope();
        if (this.mode === 'deny-all') {
            return false;
        }
        return this.overrides.get(toolId);
    }
    assertEnabled() {
        if (!this.debugCapable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, 'Tool permission debugging is unavailable.');
        }
    }
    snapshot(authorization, tools) {
        this.assertEnabled();
        this.synchronizeScope();
        if (authorization !== this.authorization) {
            this.authorization = authorization;
            this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
        }
        const active = this.account.currentUserSocketSession !== null;
        return {
            revision: this.revision,
            active,
            mode: this.mode,
            ...this.mode === 'default' && this.overrides.size === 0 ? {} : {
                rejectionCode: this.rejectionCode
            },
            tools: tools.map((tool)=>{
                const authorized = active && authorization.committed && !authorization.excludedToolIds.includes(tool.id);
                const override = this.overrides.get(tool.id);
                return {
                    tool: structuredClone(tool),
                    authorized,
                    ...override === undefined ? {} : {
                        override
                    },
                    allowed: active && authorization.committed && this.mode !== 'deny-all' && (override ?? authorized)
                };
            })
        };
    }
    set(params, snapshot) {
        this.assertRevision(params?.revision, snapshot);
        if (typeof params.allowed !== 'boolean' || !Array.isArray(params.toolIds) || params.toolIds.length === 0 || params.toolIds.length > snapshot.tools.length || Array.from(params.toolIds).some((id)=>!snapshot.tools.some(({ tool })=>tool.id === id))) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The debug tool permission selection is invalid.');
        }
        for (const toolId of params.toolIds){
            this.overrides.set(toolId, params.allowed);
        }
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    setRejectionCode(params, snapshot) {
        this.assertRevision(params?.revision, snapshot);
        if (params.code !== base_InterfaceErrorCode.PermissionRequired && params.code !== base_InterfaceErrorCode.PermissionDenied) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The simulated tool permission error is invalid.');
        }
        if (this.mode === 'default' && this.overrides.size === 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Choose Deny all or change a tool permission before choosing its simulated error.');
        }
        this.preferredRejectionCode = params.code;
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    setMode(params, snapshot) {
        this.assertRevision(params?.revision, snapshot);
        if (params.mode !== 'default' && params.mode !== 'deny-all') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The debug tool permission mode is invalid.');
        }
        this.mode = params.mode;
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    reset(params, snapshot) {
        this.assertRevision(params?.revision, snapshot);
        this.overrides.clear();
        this.mode = 'default';
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    assertAllowed(toolId, context) {
        if (this.get(toolId) !== false) {
            return;
        }
        const code = this.rejectionCode;
        let message = 'Tool access was denied by the local debug permission override.';
        if (code === base_InterfaceErrorCode.PermissionRequired) {
            message = 'Tool permission is required by the local debug permission override.';
        }
        const permissionId = `debug.tool.${toolId}`;
        if (context) {
            this.emit('denied', {
                ...context,
                toolId,
                startedAt: Date.now(),
                error: {
                    code,
                    message,
                    permissionId
                }
            });
        }
        throw interface_error_InterfaceError(code, message, {
            permissionId
        });
    }
    get rejectionCode() {
        return this.preferredRejectionCode ?? base_InterfaceErrorCode.PermissionRequired;
    }
    assertRevision(revision, snapshot) {
        this.assertEnabled();
        this.synchronizeScope();
        if (revision !== this.revision || revision !== snapshot.revision) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Tool permissions changed. Refresh the panel and try again.');
        }
        if (!snapshot.active) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before changing debug tool permissions.');
        }
    }
    scopeKey(scope) {
        return JSON.stringify(scope && [
            scope.accountId,
            scope.environment,
            scope.sessionGeneration
        ]);
    }
    synchronizeScope() {
        const session = this.account.currentUserSocketSession;
        const scope = this.scopeKey(session);
        if (scope === this.scope) {
            return;
        }
        this.scope = scope;
        this.overrides.clear();
        this.mode = 'default';
        this.authorization = undefined;
        this.preferredRejectionCode = undefined;
        this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
    constructor(...args){
        super(...args), this.overrides = new Map(), this.mode = 'default', this.revision = (0,external_node_crypto_namespaceObject.randomUUID)();
    }
}
__decorate([
    inject(DEBUG_CAPABLE),
    optional_optional(),
    __metadata("design:type", Boolean)
], DebugToolPermissionOverrides.prototype, "debugCapable", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], DebugToolPermissionOverrides.prototype, "account", void 0);
DebugToolPermissionOverrides = __decorate([
    injectable()
], DebugToolPermissionOverrides);
