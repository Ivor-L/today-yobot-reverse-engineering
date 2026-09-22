// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/initializer/index.ts.
// The original TypeScript and import graph are not restored.












class ToolAuthorizationInitializer {
    async create(scope, legacy) {
        const { platform } = await this.cpi.system.getSystemInfo();
        const registrations = await this.cpi.tools.listToolRegistrations();
        if (registrations.length === 0) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Wait for the Native tool catalog before restoring local access.');
        }
        let permissions = [];
        try {
            permissions = await this.cpi.permissions.listPermissions();
        } catch  {
            this.logger.warn('tools.authorization', 'permission discovery unavailable; preserving unknown product access');
        }
        const knownConnectorIds = [
            ...new Set([
                ...desktopConnectorIds(platform),
                ...legacy?.connectorIds ?? []
            ])
        ].filter((id)=>isCurrentPlatformConnector(id, platform));
        const denied = permissions.filter(({ state })=>state === (/* inlined export .PermissionState.Denied */"denied") || state === (/* inlined export .PermissionState.Restricted */"restricted"));
        const previousAllowed = new Set(legacy?.toolIds ?? []);
        const excludedToolIds = registrations.filter(({ id, availability })=>!AUTOMATIC_DEVICE_TOOL_IDS.has(id) && !previousAllowed.has(id) && // Native can resolve per-tool grants more precisely than a connector's
            // composite status (e.g. Messages send vs. database access).
            availability !== (/* inlined export .ToolAvailabilityState.Available */"available") && // The four folder selections are explicitly restored together. A single
            // denied directory must not exclude fs.* shared by the other directories.
            !id.startsWith('fs.') && denied.some((permission)=>connectorOwnsTool(permission.id, id))).map(({ id })=>id);
        const connectorIds = knownConnectorIds.filter((id)=>!excludedToolIds.some((toolId)=>connectorOwnsTool(id, toolId)));
        const isNewUser = await this.isNewUser(scope, legacy);
        const authorization = Object.freeze({
            connectorIds: Object.freeze([
                ...new Set([
                    ...fileConnectorIds(platform),
                    ...connectorIds
                ])
            ]),
            excludedToolIds: Object.freeze(excludedToolIds),
            fileRoots: Object.freeze(Object.values(base_ToolFileRoot)),
            committed: !isNewUser
        });
        this.logger.info('tools.authorization', `prepared v2: mode=${isNewUser ? 'draft' : 'recovery'} tools=${registrations.length} excluded=${excludedToolIds.length} connectors=${authorization.connectorIds.length}`);
        return Object.freeze({
            authorization,
            effectiveAuthorization: authorization.committed ? authorization : null,
            knownConnectorIds: Object.freeze(knownConnectorIds),
            revision: 1,
            syncedRevision: 0
        });
    }
    async isNewUser(scope, legacy) {
        if (legacy) {
            // A persisted v1 draft was written by onboarding, not by its empty read fallback.
            return !legacy.committed;
        }
        const restored = this.accountInitializer.restoredAccount;
        if (restored?.accountId === scope.accountId && restored.environment === scope.environment) {
            return false;
        }
        const session = this.account.currentUserSocketSession;
        if (!session || session.accountId !== scope.accountId || session.environment !== scope.environment || session.sessionGeneration !== scope.sessionGeneration) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The local connector account changed.');
        }
        const client = await this.account.createApiClient(session.accessToken);
        const result = await getV1UsersMe({
            client,
            signal: AbortSignal.timeout(10000)
        });
        if (!result.response?.ok || result.data?.id !== scope.accountId || typeof result.data.onboarding?.finished !== 'boolean') {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The onboarding status is unavailable; local access initialization will retry.');
        }
        return !result.data.onboarding.finished;
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], ToolAuthorizationInitializer.prototype, "cpi", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], ToolAuthorizationInitializer.prototype, "account", void 0);
__decorate([
    inject(AccountInitializer),
    __metadata("design:type", typeof AccountInitializer === "undefined" ? Object : AccountInitializer)
], ToolAuthorizationInitializer.prototype, "accountInitializer", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], ToolAuthorizationInitializer.prototype, "logger", void 0);
ToolAuthorizationInitializer = __decorate([
    injectable()
], ToolAuthorizationInitializer);
