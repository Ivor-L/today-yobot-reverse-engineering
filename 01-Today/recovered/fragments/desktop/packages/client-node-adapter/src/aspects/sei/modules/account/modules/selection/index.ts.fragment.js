// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/selection/index.ts.
// The original TypeScript and import graph are not restored.








class AccountSelection {
    async list() {
        const record = this.state.getRecord();
        if (!record) {
            return [];
        }
        return [
            {
                user: copyPublicUser(record.user)
            }
        ];
    }
    async switch(accountId) {
        const normalized = accountId.trim();
        if (!normalized) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.InvalidArgument, 'An account ID is required.');
        }
        if (this.state.getRecord()?.user.id !== normalized) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'Sign in to use another account on this device.');
        }
    }
}
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountSelection.prototype, "state", void 0);
AccountSelection = __decorate([
    injectable()
], AccountSelection);
