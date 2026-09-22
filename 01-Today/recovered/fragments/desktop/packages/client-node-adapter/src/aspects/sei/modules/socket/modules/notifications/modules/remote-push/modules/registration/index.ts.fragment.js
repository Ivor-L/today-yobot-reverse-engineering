// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/registration/index.ts.
// The original TypeScript and import graph are not restored.














class SocketRemotePushRegistration {
    handleConnected(context) {
        this.pendingContext = context;
        if (this.committedCleanup) {
            this.startCommittedCleanup();
            return;
        }
        this.startPendingUpload();
    }
    rememberAccessToken(accessToken, identity) {
        const { accountId, environment } = identity;
        this.cachedCleanup = {
            accessToken,
            owner: Object.freeze({
                accountId,
                environment
            })
        };
    }
    prepareCleanup() {
        const session = this.account.currentUserSocketSession;
        if (session) {
            const { accessToken, accountId, environment } = session;
            this.preparedCleanup = {
                accessToken,
                owner: Object.freeze({
                    accountId,
                    environment
                })
            };
            return;
        }
        this.preparedCleanup = this.cachedCleanup ?? {
            accessToken: null,
            owner: null
        };
    }
    commitCleanup() {
        const preparedCleanup = this.preparedCleanup;
        this.preparedCleanup = undefined;
        if (!preparedCleanup) {
            return;
        }
        this.pendingContext = undefined;
        this.cachedCleanup = undefined;
        if (!this.committedCleanup) {
            this.committedCleanup = preparedCleanup;
        }
        this.startCommittedCleanup();
    }
    startPendingUpload() {
        if (this.uploadFlight || this.committedCleanup || !this.pendingContext) {
            return;
        }
        const context = this.pendingContext;
        this.pendingContext = undefined;
        const flight = this.tasks.run(async ()=>{
            await this.performUpload(context);
        });
        this.uploadFlight = flight;
        this.observeUploadFlight(flight);
    }
    async observeUploadFlight(flight) {
        try {
            await flight;
        } catch (error) {
            this.logger.warn(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, `upload failed: ${describeError(error)}`);
        } finally{
            if (this.uploadFlight === flight) {
                this.uploadFlight = undefined;
                this.startPendingUpload();
            }
        }
    }
    startCommittedCleanup() {
        if (this.cleanupFlight) {
            this.cleanupQueued = true;
            return;
        }
        if (!this.committedCleanup) {
            return;
        }
        const cleanup = this.committedCleanup;
        const flight = this.tasks.run(async ()=>{
            return await this.performDelete(cleanup);
        });
        this.cleanupQueued = false;
        this.cleanupFlight = flight;
        this.observeCleanupFlight(flight, cleanup);
    }
    async observeCleanupFlight(flight, cleanup) {
        let result = 'retained';
        try {
            result = await flight;
        } catch (error) {
            this.logger.warn(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, `delete failed: ${describeError(error)}`);
        } finally{
            if (this.cleanupFlight === flight) {
                const cleanupQueued = this.cleanupQueued;
                this.cleanupFlight = undefined;
                this.cleanupQueued = false;
                if ((result === 'cleared' || result === 'owner-mismatch') && this.committedCleanup === cleanup) {
                    this.committedCleanup = undefined;
                }
                if (!this.committedCleanup) {
                    this.startPendingUpload();
                } else if (cleanupQueued) {
                    this.startCommittedCleanup();
                }
            }
        }
    }
    async performUpload(context) {
        const { identity, registeredDeviceId } = context;
        if (!registeredDeviceId || !this.account.isCurrentUserSocketAuthContext(identity)) {
            return;
        }
        const state = await this.store.read();
        if (state.registration && !isSameRemotePushRegistrationOwner(state.registration.owner, identity)) {
            this.logger.warn(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'upload blocked by foreign registration');
            return;
        }
        if (state.registration?.cleanupPending) {
            const freshContext = await this.account.getFreshUserSocketAuthContext();
            if (!freshContext || !isSameUserSocketSession(identity, freshContext)) {
                return;
            }
            const result = await this.performDelete({
                accessToken: freshContext.accessToken,
                owner: {
                    accountId: identity.accountId,
                    environment: identity.environment
                }
            });
            if (result !== 'cleared') {
                return;
            }
        }
        const registration = await this.remotePushHost.register();
        if (!registration) {
            this.logger.info(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'registration unavailable');
            return;
        }
        if (!this.account.isCurrentUserSocketAuthContext(identity)) {
            return;
        }
        const freshContext = await this.account.getFreshUserSocketAuthContext();
        if (!freshContext || !isSameUserSocketSession(identity, freshContext)) {
            return;
        }
        await this.store.write({
            version: (/* inlined export .REMOTE_PUSH_REGISTRATION_STATE_SCHEMA_VERSION */1),
            registration: {
                deviceId: registeredDeviceId,
                owner: {
                    accountId: identity.accountId,
                    environment: identity.environment
                }
            }
        });
        const client = await this.account.createApiClient(freshContext.accessToken);
        const result = await putV1PushTokens({
            body: toPushTokenBody(registeredDeviceId, registration),
            client
        });
        if (!result.response?.ok) {
            throw new Error(`push token upload rejected with status ${result.response?.status ?? 'none'}`);
        }
        this.logger.info(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'registration uploaded');
    }
    async performDelete(cleanup) {
        const state = await this.store.read();
        if (!state.registration) {
            return 'cleared';
        }
        const { accessToken, owner } = cleanup;
        if (!owner || !isSameRemotePushRegistrationOwner(state.registration.owner, owner)) {
            this.logger.warn(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'delete skipped because the registration owner is unavailable');
            return 'owner-mismatch';
        }
        if (!state.registration.cleanupPending) {
            await this.store.write({
                ...state,
                registration: {
                    ...state.registration,
                    cleanupPending: true
                }
            });
        }
        if (!accessToken) {
            this.logger.warn(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'delete skipped because credentials are unavailable');
            return 'retained';
        }
        const client = await this.account.createApiClient(accessToken);
        const result = await deleteV1PushTokensByDeviceId({
            path: {
                deviceId: state.registration.deviceId
            },
            client
        });
        const status = result.response?.status ?? 0;
        if (!result.response?.ok && status !== 404) {
            throw new Error(`push token delete rejected with status ${status || 'none'}`);
        }
        await this.store.write(createEmptyRemotePushRegistrationState());
        this.logger.info(REMOTE_PUSH_REGISTRATION_LOG_CATEGORY, 'registration deleted');
        return 'cleared';
    }
    constructor(){
        this.cleanupQueued = false;
    }
}
__decorate([
    inject(DesktopRemotePush),
    __metadata("design:type", typeof DesktopRemotePush === "undefined" ? Object : DesktopRemotePush)
], SocketRemotePushRegistration.prototype, "remotePushHost", void 0);
__decorate([
    inject(AccountShellService),
    __metadata("design:type", typeof AccountShellService === "undefined" ? Object : AccountShellService)
], SocketRemotePushRegistration.prototype, "account", void 0);
__decorate([
    inject(RemotePushRegistrationStore),
    __metadata("design:type", typeof RemotePushRegistrationStore === "undefined" ? Object : RemotePushRegistrationStore)
], SocketRemotePushRegistration.prototype, "store", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], SocketRemotePushRegistration.prototype, "tasks", void 0);
__decorate([
    inject(AdapterLogger),
    __metadata("design:type", typeof AdapterLogger === "undefined" ? Object : AdapterLogger)
], SocketRemotePushRegistration.prototype, "logger", void 0);
SocketRemotePushRegistration = __decorate([
    injectable()
], SocketRemotePushRegistration);
