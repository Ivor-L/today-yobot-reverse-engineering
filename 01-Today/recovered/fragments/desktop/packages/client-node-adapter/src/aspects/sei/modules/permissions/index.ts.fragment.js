// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/permissions/index.ts.
// The original TypeScript and import graph are not restored.





class PermissionsShellService {
    subscribe(eventName, listener) {
        return this.cpi.permissions.subscribe(eventName, listener);
    }
    listPermissions() {
        return this.cpi.permissions.listPermissions();
    }
    getPermissionInfo(params) {
        const { permissionId } = params;
        return this.cpi.permissions.getPermissionInfo({
            permissionId
        });
    }
    performPermissionAction(params) {
        // SEI 层的 anchor 已是屏幕坐标（WEI 进来的在 WEI 模块换算过；Shell 自己调用时
        // 本就持有屏幕坐标），原样跨 CPI。
        const { action, permissionId, sourceFrame } = params;
        return this.cpi.permissions.performPermissionAction({
            action,
            permissionId,
            ...sourceFrame ? {
                sourceFrame
            } : {}
        });
    }
}
__decorate([
    inject(CROSS_PLATFORM_INTERFACE),
    __metadata("design:type", typeof ICrossPlatformInterface === "undefined" ? Object : ICrossPlatformInterface)
], PermissionsShellService.prototype, "cpi", void 0);
PermissionsShellService = __decorate([
    injectable()
], PermissionsShellService);
