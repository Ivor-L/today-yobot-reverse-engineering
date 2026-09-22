// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/reader/modules/refresh/index.ts.
// The original TypeScript and import graph are not restored.













class AccountRefresh {
    async ensure(record, generation, options) {
        if (this.flight?.generation === generation) {
            return await this.flight.promise;
        }
        if (!this.shouldRefresh(record)) {
            if (!options?.forceRefresh) {
                return record;
            }
            if (options.staleToken !== undefined && options.staleToken !== record.accessToken) {
                return record;
            }
        }
        const promise = this.runRefresh(record, generation);
        const flight = {
            generation,
            promise
        };
        this.flight = flight;
        this.watch(flight);
        return await promise;
    }
    shouldRefresh(record) {
        return record.accessTokenExpiresAt <= this.settings.now() + this.settings.refreshSkewMs;
    }
    async watch(flight) {
        try {
            await flight.promise;
        } catch  {
        // The original caller receives the refresh error.
        }
        if (this.flight === flight) {
            this.flight = undefined;
        }
    }
    async runRefresh(record, generation) {
        const expired = record.accessTokenExpiresAt <= this.settings.now();
        let result;
        try {
            result = await this.authenticator.refresh(record);
        } catch (error) {
            const normalized = interface_error_InterfaceError(error, 'The account session could not be refreshed.');
            if (error instanceof interface_error_InterfaceError && error.terminal) {
                let logout = false;
                try {
                    await this.state.mutate(async ()=>{
                        if (this.state.getGeneration() !== generation || this.state.getRecord() !== record) {
                            return;
                        }
                        logout = true;
                        await this.transition.runSignOut(false);
                    });
                } finally{
                    if (logout) {
                        this.tracer.pushAuthFailed({
                            code: normalized.code,
                            expired,
                            logout: true,
                            ...normalized.status === undefined ? {} : {
                                status: normalized.status
                            },
                            via: 'refresh'
                        });
                    }
                }
                throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account session is no longer valid.');
            }
            this.tracer.pushAuthFailed({
                code: normalized.code,
                expired,
                logout: false,
                ...normalized.status === undefined ? {} : {
                    status: normalized.status
                },
                via: 'refresh'
            });
            throw normalized;
        }
        const { accessToken, accessTokenExpiresAt, refreshCredential } = result;
        try {
            const refreshedRecord = await this.state.mutate(async ()=>{
                if (this.state.getGeneration() !== generation || this.state.getRecord() !== record) {
                    throw interface_error_InterfaceError(base_InterfaceErrorCode.AuthRequired, 'The account changed while refreshing authentication.');
                }
                if (!accessToken || !refreshCredential || !lodash_es_isSafeInteger(accessTokenExpiresAt) || accessTokenExpiresAt <= this.settings.now()) {
                    throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The authentication service returned invalid refreshed credentials.');
                }
                const refreshed = {
                    ...record,
                    accessToken,
                    accessTokenExpiresAt,
                    refreshCredential
                };
                try {
                    await this.store.save(refreshed);
                } catch (error) {
                    try {
                        await this.store.save(record);
                    } catch  {
                        await this.transition.clearAfterRollback();
                        throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The refreshed account credential transaction could not be rolled back safely.');
                    }
                    throw interface_error_InterfaceError(error, 'The refreshed account session could not be persisted.');
                }
                this.state.setRecord(refreshed);
                return refreshed;
            });
            this.tracer.pushAuthSuccess({
                via: 'refresh'
            });
            return refreshedRecord;
        } catch (error) {
            throw interface_error_InterfaceError(error, 'The refreshed account session could not be persisted.');
        }
    }
}
__decorate([
    inject(DefaultAccountAuthenticator),
    __metadata("design:type", typeof DefaultAccountAuthenticator === "undefined" ? Object : DefaultAccountAuthenticator)
], AccountRefresh.prototype, "authenticator", void 0);
__decorate([
    inject(EncryptedAccountCredentialStore),
    __metadata("design:type", typeof EncryptedAccountCredentialStore === "undefined" ? Object : EncryptedAccountCredentialStore)
], AccountRefresh.prototype, "store", void 0);
__decorate([
    inject(AccountSettings),
    __metadata("design:type", typeof AccountSettings === "undefined" ? Object : AccountSettings)
], AccountRefresh.prototype, "settings", void 0);
__decorate([
    inject(AccountState),
    __metadata("design:type", typeof AccountState === "undefined" ? Object : AccountState)
], AccountRefresh.prototype, "state", void 0);
__decorate([
    inject(AccountSessionTransition),
    __metadata("design:type", typeof AccountSessionTransition === "undefined" ? Object : AccountSessionTransition)
], AccountRefresh.prototype, "transition", void 0);
__decorate([
    inject(AccountTracer),
    __metadata("design:type", typeof AccountTracer === "undefined" ? Object : AccountTracer)
], AccountRefresh.prototype, "tracer", void 0);
AccountRefresh = __decorate([
    injectable()
], AccountRefresh);
