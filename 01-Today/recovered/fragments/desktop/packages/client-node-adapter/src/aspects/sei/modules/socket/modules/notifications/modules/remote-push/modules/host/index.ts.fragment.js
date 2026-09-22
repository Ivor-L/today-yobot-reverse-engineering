// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/host/index.ts.
// The original TypeScript and import graph are not restored.






class DesktopRemotePush extends readonly_events_ReadonlyEvents {
    async subscribe(eventName, listener) {
        const subscription = await super.subscribe(eventName, listener);
        try {
            this.syncElectronListener();
        } catch (error) {
            await subscription.unsubscribe();
            throw error;
        }
        let active = true;
        return Object.freeze({
            unsubscribe: async ()=>{
                if (!active) {
                    return;
                }
                await subscription.unsubscribe();
                this.syncElectronListener();
                active = false;
            }
        });
    }
    async register() {
        if (process.platform !== 'darwin') {
            return null;
        }
        if (this.registration) {
            return this.registration;
        }
        try {
            const token = await external_electron_.pushNotifications.registerForAPNSNotifications();
            if (token.length === 0) {
                return null;
            }
            const registration = Object.freeze({
                provider: 'apns',
                platform: 'macos',
                token
            });
            this.registration = registration;
            return registration;
        } catch (error) {
            console.warn('[desktop] APNs registration failed', error);
            return null;
        }
    }
    syncElectronListener() {
        const shouldListen = process.platform === 'darwin' && this.listenerCount('received') > 0;
        if (shouldListen === this.listening) {
            return;
        }
        if (shouldListen) {
            external_electron_.pushNotifications.on('received-apns-notification', this.handleRemotePush);
            this.listening = true;
            return;
        }
        external_electron_.pushNotifications.off('received-apns-notification', this.handleRemotePush);
        this.listening = false;
    }
    constructor(...args){
        super(...args), this.listening = false, this.registration = null, this.handleRemotePush = (_event, payload)=>{
            this.emit('received', normalizeRemotePushNotification(payload));
        };
    }
}
DesktopRemotePush = __decorate([
    injectable()
], DesktopRemotePush);
