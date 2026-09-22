// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tools/modules/file-inventory/modules/uploader/index.ts.
// The original TypeScript and import graph are not restored.











class FileInventoryUploader {
    async upload(snapshots, scope, expectedAuthorization, signal) {
        const session = await this.account.getFreshUserSocketAuthContext();
        this.authorization.assertCurrentScope(scope);
        if (!session || !this.account.isCurrentUserSocketAuthContext(session)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The local file upload account changed.');
        }
        const client = await this.account.createApiClient(session.accessToken);
        const clientPlatform = this.account.runtimeSnapshot.clientPlatform;
        const platform = INVENTORY_PLATFORMS[clientPlatform];
        const data = {
            connectors: snapshots.map((snapshot)=>({
                    connectorId: `${platform}_${snapshot.root}`,
                    ...snapshot
                }))
        };
        if (Buffer.byteLength(JSON.stringify(data), 'utf8') > (/* inlined export .MAX_FILE_INVENTORY_UPLOAD_BYTES */512000)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.ResourceExhausted, 'The local file scan is too large.');
        }
        const current = await this.authorization.getAuthorization(scope);
        this.authorization.assertCurrentScope(scope);
        signal.throwIfAborted();
        if (current !== expectedAuthorization || !current.committed) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The local file upload selection changed.');
        }
        const result = await postV1OnboardingDeviceFileSystemUpload({
            body: {
                data
            },
            client,
            headers: {
                'x-client-platform': clientPlatform
            },
            signal
        });
        signal.throwIfAborted();
        this.authorization.assertCurrentScope(scope);
        if (!result.response?.ok || result.error !== undefined || result.data?.data.ok !== true) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The server did not accept the file scan.');
        }
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], FileInventoryUploader.prototype, "account", void 0);
__decorate([
    inject(ToolAuthorizationService),
    __metadata("design:type", typeof ToolAuthorizationService === "undefined" ? Object : ToolAuthorizationService)
], FileInventoryUploader.prototype, "authorization", void 0);
FileInventoryUploader = __decorate([
    injectable()
], FileInventoryUploader);
