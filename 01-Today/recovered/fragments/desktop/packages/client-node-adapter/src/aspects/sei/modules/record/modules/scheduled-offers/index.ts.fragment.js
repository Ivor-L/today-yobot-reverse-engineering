// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/scheduled-offers/index.ts.
// The original TypeScript and import graph are not restored.










class RecordScheduledOffers {
    async list() {
        const context = await this.account.getFreshUserSocketAuthContext();
        this.assertCurrent(context);
        const client = await this.account.createApiClient(context.accessToken);
        this.assertCurrent(context);
        const result = await getV1ScheduledActions({
            client,
            signal: AbortSignal.timeout(10000)
        });
        this.assertCurrent(context);
        if (!result.response?.ok || !result.data?.success || !Array.isArray(result.data.data?.items)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'Meeting reminders could not be loaded. Please try again.');
        }
        return result.data.data.items.flatMap((action)=>{
            const offer = recordingOfferFromScheduledAction(action);
            if (!offer) {
                return [];
            }
            return [
                offer
            ];
        });
    }
    assertCurrent(context) {
        if (!context || this.accountBarrier.suspended || !this.account.isCurrentUserSocketAuthContext(context)) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account session changed.');
        }
    }
}
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], RecordScheduledOffers.prototype, "account", void 0);
__decorate([
    inject(AccountSessionBarrier),
    __metadata("design:type", typeof AccountSessionBarrier === "undefined" ? Object : AccountSessionBarrier)
], RecordScheduledOffers.prototype, "accountBarrier", void 0);
RecordScheduledOffers = __decorate([
    injectable()
], RecordScheduledOffers);
