// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/index.ts.
// The original TypeScript and import graph are not restored.







class SocketRemotePush extends readonly_events_ReadonlyEvents {
    async initialize() {
        await this.lifecycle.run(async ()=>{
            if (this.subscription) {
                return;
            }
            await this.performInitialize();
        });
    }
    async dispose() {
        await this.lifecycle.run(async ()=>{
            const subscription = this.subscription;
            this.subscription = undefined;
            if (subscription) {
                await subscription.unsubscribe();
            }
        });
    }
    handleConnected(context) {
        this.registration.handleConnected(context);
    }
    rememberAccessToken(accessToken, identity) {
        this.registration.rememberAccessToken(accessToken, identity);
    }
    prepareRegistrationCleanup() {
        this.registration.prepareCleanup();
    }
    commitRegistrationCleanup() {
        this.registration.commitCleanup();
    }
    async performInitialize() {
        const subscription = await this.remotePushHost.subscribe('received', (notification)=>{
            this.emit('received', notification);
        });
        this.subscription = subscription;
    }
}
__decorate([
    inject(DesktopRemotePush),
    __metadata("design:type", typeof DesktopRemotePush === "undefined" ? Object : DesktopRemotePush)
], SocketRemotePush.prototype, "remotePushHost", void 0);
__decorate([
    inject(SocketRemotePushRegistration),
    __metadata("design:type", typeof SocketRemotePushRegistration === "undefined" ? Object : SocketRemotePushRegistration)
], SocketRemotePush.prototype, "registration", void 0);
__decorate([
    inject(SerialTask),
    __metadata("design:type", typeof SerialTask === "undefined" ? Object : SerialTask)
], SocketRemotePush.prototype, "lifecycle", void 0);
SocketRemotePush = __decorate([
    injectable()
], SocketRemotePush);
