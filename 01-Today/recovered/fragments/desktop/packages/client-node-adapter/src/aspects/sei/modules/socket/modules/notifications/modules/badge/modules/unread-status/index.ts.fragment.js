// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/badge/modules/unread-status/index.ts.
// The original TypeScript and import graph are not restored.







class SocketUnreadStatus {
    async read() {
        const context = await this.account.getFreshUserSocketAuthContext();
        if (!context) {
            return null;
        }
        const client = await this.account.createApiClient(context.accessToken);
        const result = await getV1UnreadStatus({
            client
        });
        if (!result.response?.ok || !result.data) {
            throw new Error(`unread status rejected with status ${result.response?.status ?? 'none'}`);
        }
        return {
            identity: toUserSocketSessionIdentity(context),
            unreadCount: result.data.unreadCount
        };
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketUnreadStatus.prototype, "account", void 0);
SocketUnreadStatus = __decorate([
    injectable()
], SocketUnreadStatus);
