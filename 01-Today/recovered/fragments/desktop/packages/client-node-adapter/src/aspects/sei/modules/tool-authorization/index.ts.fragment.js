// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/index.ts.
// The original TypeScript and import graph are not restored.
















class ToolAuthorizationService {
    async getDebugPermissions() {
        this.debugOverrides.assertEnabled();
        const scope = this.currentScope;
        const authorization = await this.getEffectiveAuthorization(scope);
        const tools = await this.cpi.tools.listTools();
        if (scope) {
            this.assertCurrentScope(scope);
        } else if (this.currentScope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'The local connector account changed.');
        }
        const current = scope && this.states.get(toolAuthorizationScopeKey(scope))?.effectiveAuthorization;
        if ((current || EMPTY_TOOL_AUTHORIZATION) !== authorization) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Local connector access changed while loading tool permissions.');
        }
        return this.debugOverrides.snapshot(authorization, tools);
    }
    async setDebugPermissions(params) {
        const snapshot = await this.getDebugPermissions();
        this.debugOverrides.set(params, this.projectDebugPermissions(snapshot));
        return this.projectDebugPermissions(snapshot);
    }
    async setDebugPermissionRejectionCode(params) {
        const snapshot = await this.getDebugPermissions();
        this.debugOverrides.setRejectionCode(params, this.projectDebugPermissions(snapshot));
        return this.projectDebugPermissions(snapshot);
    }
    async setDebugMode(params) {
        const snapshot = await this.getDebugPermissions();
        this.debugOverrides.setMode(params, this.projectDebugPermissions(snapshot));
        return this.projectDebugPermissions(snapshot);
    }
    resetDebugAfterAuthorization(scope) {
        this.assertCurrentScope(scope);
        this.debugOverrides.resetAfterAuthorization(scope);
    }
    async resetDebugPermissions(params) {
        const snapshot = await this.getDebugPermissions();
        this.debugOverrides.reset(params, this.projectDebugPermissions(snapshot));
        return this.projectDebugPermissions(snapshot);
    }
    assertDebugInvocationAllowed(toolId, context) {
        this.debugOverrides.assertAllowed(toolId, context);
    }
    subscribeDebugDenied(listener) {
        this.debugOverrides.assertEnabled();
        return this.debugOverrides.subscribe('denied', listener);
    }
    projectDebugPermissions(snapshot) {
        const scope = this.currentScope;
        const authorization = scope && this.states.get(toolAuthorizationScopeKey(scope))?.effectiveAuthorization;
        return this.debugOverrides.snapshot(authorization || EMPTY_TOOL_AUTHORIZATION, snapshot.tools.map(({ tool })=>tool));
    }
    get currentScope() {
        const session = this.account.currentUserSocketSession;
        if (!session) {
            return null;
        }
        return {
            accountId: session.accountId,
            environment: session.environment,
            sessionGeneration: session.sessionGeneration
        };
    }
    async getAuthorization(scope = this.currentScope) {
        if (!scope) {
            return EMPTY_TOOL_AUTHORIZATION;
        }
        const record = await this.tasks.run(async ()=>await this.read(scope));
        this.assertCurrentScope(scope);
        return record.authorization;
    }
    async getEffectiveAuthorization(scope = this.currentScope) {
        if (!scope) {
            return EMPTY_TOOL_AUTHORIZATION;
        }
        const record = await this.tasks.run(async ()=>await this.read(scope));
        this.assertCurrentScope(scope);
        return record.effectiveAuthorization ?? EMPTY_TOOL_AUTHORIZATION;
    }
    async assertSynced(scope) {
        const record = await this.tasks.run(async ()=>await this.read(scope));
        this.assertCurrentScope(scope);
        if (!record.authorization.committed || record.syncedRevision !== record.revision) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Synchronize local connector access before uploading files.');
        }
    }
    async commitAuthorization(scope = this.currentScope) {
        if (!scope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before confirming local access.');
        }
        await this.tasks.run(async ()=>{
            const previous = await this.read(scope);
            if (!previous.authorization.committed) {
                await this.save(scope, previous, Object.freeze({
                    ...previous.authorization,
                    committed: true
                }));
            }
        });
    }
    isAuthorized(toolId) {
        const scope = this.currentScope;
        if (!scope) {
            return false;
        }
        const state = this.states.get(toolAuthorizationScopeKey(scope))?.effectiveAuthorization;
        return state?.committed === true && (this.debugOverrides.get(toolId) ?? !state.excludedToolIds.includes(toolId));
    }
    async isInvocationAuthorized(toolId, input) {
        const scope = this.currentScope;
        const state = await this.getEffectiveAuthorization(scope);
        if (!scope || !state.committed || !(this.debugOverrides.get(toolId) ?? !state.excludedToolIds.includes(toolId))) {
            return false;
        }
        const allowed = await this.fileScope.allows(toolId, input, state.fileRoots);
        this.assertCurrentScope(scope);
        return allowed && this.isAuthorized(toolId) && this.states.get(toolAuthorizationScopeKey(scope))?.effectiveAuthorization === state;
    }
    async projectCatalog(registrations, scope) {
        const record = await this.tasks.run(async ()=>await this.read(scope));
        this.assertCurrentScope(scope);
        const { platform } = await this.cpi.system.getSystemInfo();
        const knownConnectorIds = [
            ...new Set([
                ...fileConnectorIds(platform),
                ...record.knownConnectorIds
            ])
        ].filter((id)=>isCurrentPlatformConnector(id, platform));
        if (knownConnectorIds.length > (/* inlined export .MAX_KNOWN_CONNECTOR_IDS */256)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The local connector history exceeds the supported snapshot size.');
        }
        const { authorization } = record;
        if (!authorization.committed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'Confirm the local connector draft before synchronizing tools.');
        }
        const projectedRegistrations = await this.projectAuthorizedRegistrations(registrations, authorization);
        const assertCurrent = ()=>{
            this.assertCurrentScope(scope);
            if (this.states.get(toolAuthorizationScopeKey(scope)) !== record) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local connector selection changed during catalog projection.');
            }
        };
        assertCurrent();
        const selectedIds = new Set(authorization.connectorIds);
        return {
            revision: record.revision,
            assertCurrent,
            acknowledge: async ()=>{
                await this.tasks.run(async ()=>{
                    assertCurrent();
                    const synced = Object.freeze({
                        ...record,
                        syncedRevision: record.revision
                    });
                    await this.store.write(scope, synced);
                    this.states.set(toolAuthorizationScopeKey(scope), synced);
                    this.assertCurrentScope(scope);
                });
            },
            registrations: projectedRegistrations,
            connectorSnapshot: {
                connectors: knownConnectorIds.sort().map((connectorId)=>({
                        connectorId,
                        granted: authorization.committed && selectedIds.has(connectorId)
                    })),
                timestamp: new Date().toISOString()
            }
        };
    }
    async projectAuthorizedRegistrations(registrations, authorization) {
        const excludedIds = new Set(authorization.excludedToolIds);
        const result = [];
        for (const registration of registrations){
            const restricted = await this.fileScope.restrictRegistration(registration, authorization.fileRoots);
            result.push({
                ...restricted,
                enabled: restricted.enabled && authorization.committed && !excludedIds.has(registration.id)
            });
        }
        return result;
    }
    async setAuthorization(params, scope = this.currentScope) {
        if (!scope) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in before changing local connector access.');
        }
        const parsed = parseAuthorizationState(params);
        if (!parsed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The local connector selection is invalid.');
        }
        const authorization = Object.freeze({
            ...parsed,
            excludedToolIds: Object.freeze(parsed.excludedToolIds.filter((id)=>!AUTOMATIC_DEVICE_TOOL_IDS.has(id)))
        });
        return await this.tasks.run(async ()=>{
            const previous = await this.read(scope);
            await this.save(scope, previous, authorization);
            return authorization;
        });
    }
    async save(scope, previous, authorization) {
        this.assertCurrentScope(scope);
        const { platform } = await this.cpi.system.getSystemInfo();
        this.assertCurrentScope(scope);
        const knownConnectorIds = Object.freeze([
            ...new Set([
                ...fileConnectorIds(platform),
                ...previous.knownConnectorIds,
                ...authorization.connectorIds
            ])
        ]);
        if (knownConnectorIds.length > (/* inlined export .MAX_KNOWN_CONNECTOR_IDS */256)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'The local connector history exceeds the supported snapshot size.');
        }
        const record = Object.freeze({
            authorization,
            effectiveAuthorization: authorization.committed ? authorization : previous.effectiveAuthorization,
            knownConnectorIds,
            revision: previous.revision + 1,
            syncedRevision: previous.syncedRevision
        });
        const effective = previous.effectiveAuthorization;
        if (authorization.committed && effective) {
            // Apply revocations immediately; new grants become effective only after persistence.
            const revoked = Object.freeze({
                ...effective,
                connectorIds: Object.freeze(effective.connectorIds.filter((id)=>authorization.connectorIds.includes(id))),
                excludedToolIds: Object.freeze([
                    ...new Set([
                        ...effective.excludedToolIds,
                        ...authorization.excludedToolIds
                    ])
                ]),
                fileRoots: Object.freeze(effective.fileRoots.filter((root)=>authorization.fileRoots.includes(root)))
            });
            this.states.set(toolAuthorizationScopeKey(scope), Object.freeze({
                ...previous,
                authorization: revoked,
                effectiveAuthorization: revoked,
                knownConnectorIds
            }));
        }
        await this.store.write(scope, record);
        this.states.set(toolAuthorizationScopeKey(scope), record);
        this.assertCurrentScope(scope);
    }
    assertCurrentScope(scope) {
        const current = this.currentScope;
        if (!current || toolAuthorizationScopeKey(current) !== toolAuthorizationScopeKey(scope) || current.sessionGeneration !== scope.sessionGeneration) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The local connector account changed.');
        }
    }
    async read(scope) {
        const key = toolAuthorizationScopeKey(scope);
        const cached = this.states.get(key);
        if (cached) {
            return cached;
        }
        let record = await this.store.read(scope);
        this.assertCurrentScope(scope);
        if (!record) {
            record = await this.initializer.create(scope, await this.store.readLegacy(scope));
            this.assertCurrentScope(scope);
            await this.store.write(scope, record);
        }
        this.assertCurrentScope(scope);
        this.states.set(key, record);
        return record;
    }
    constructor(){
        this.states = new Map();
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof Pick === "undefined" ? Object : Pick)
], ToolAuthorizationService.prototype, "cpi", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], ToolAuthorizationService.prototype, "account", void 0);
__decorate([
    inject(ToolAuthorizationStore),
    __metadata("design:type", typeof ToolAuthorizationStore === "undefined" ? Object : ToolAuthorizationStore)
], ToolAuthorizationService.prototype, "store", void 0);
__decorate([
    inject(ToolAuthorizationInitializer),
    __metadata("design:type", typeof ToolAuthorizationInitializer === "undefined" ? Object : ToolAuthorizationInitializer)
], ToolAuthorizationService.prototype, "initializer", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], ToolAuthorizationService.prototype, "tasks", void 0);
__decorate([
    inject(FileToolAuthorization),
    __metadata("design:type", typeof FileToolAuthorization === "undefined" ? Object : FileToolAuthorization)
], ToolAuthorizationService.prototype, "fileScope", void 0);
__decorate([
    inject(DebugToolPermissionOverrides),
    __metadata("design:type", typeof DebugToolPermissionOverrides === "undefined" ? Object : DebugToolPermissionOverrides)
], ToolAuthorizationService.prototype, "debugOverrides", void 0);
ToolAuthorizationService = __decorate([
    injectable()
], ToolAuthorizationService);
