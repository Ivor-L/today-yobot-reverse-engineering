// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/account/index.ts.
// The original TypeScript and import graph are not restored.







class AccountWebService {
    subscribe(eventName, listener) {
        return this.shell.subscribe(eventName, listener);
    }
    signInWithOAuth(params) {
        const { providerId } = params;
        return this.shell.signInWithOAuth({
            providerId
        });
    }
    requestEmailCode(params) {
        const { email } = params;
        return this.shell.requestEmailCode({
            email
        });
    }
    verifyEmailCode(params) {
        const { code, email } = params;
        return this.shell.verifyEmailCode({
            code,
            email
        });
    }
    requestPhoneCode(params) {
        const { phoneNumber } = params;
        return this.shell.requestPhoneCode({
            phoneNumber
        });
    }
    verifyPhoneCode(params) {
        const { code, phoneNumber } = params;
        return this.shell.verifyPhoneCode({
            code,
            phoneNumber
        });
    }
    getAccountSnapshot() {
        return this.shell.getAccountSnapshot();
    }
    getFreshAccountSnapshot() {
        return this.shell.getFreshAccountSnapshot();
    }
    listAccounts() {
        return this.shell.listAccounts();
    }
    switchAccount(params) {
        const { accountId } = params;
        return this.shell.switchAccount({
            accountId
        });
    }
    signOut() {
        return this.shell.signOut();
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], AccountWebService.prototype, "shell", void 0);
AccountWebService = __decorate([
    logCalls((/* inlined export .PushTarget.Sentry */"sentry")),
    injectable()
], AccountWebService);
