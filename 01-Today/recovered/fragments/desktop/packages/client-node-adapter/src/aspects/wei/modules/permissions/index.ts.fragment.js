// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/permissions/index.ts.
// The original TypeScript and import graph are not restored.








class PermissionsWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    listPermissions() {
        return this.shell.listPermissions();
    }
    getPermissionInfo(params) {
        const { permissionId } = params;
        return this.shell.getPermissionInfo({
            permissionId
        });
    }
    performPermissionAction(params) {
        const { action, permissionId, sourceFrame } = params;
        // WEI 进来的 anchor 是视口坐标，跨出 WEI 前统一换算成屏幕坐标（契约约定）。
        const screenFrame = sourceFrame ? viewportAnchorToScreenRect(sourceFrame) : undefined;
        return this.shell.performPermissionAction({
            action,
            permissionId,
            ...screenFrame ? {
                sourceFrame: screenFrame
            } : {}
        });
    }
}
__decorate([
    inject(PermissionsShellService),
    __metadata("design:type", typeof PermissionsShellService === "undefined" ? Object : PermissionsShellService)
], PermissionsWebService.prototype, "shell", void 0);
PermissionsWebService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], PermissionsWebService);
