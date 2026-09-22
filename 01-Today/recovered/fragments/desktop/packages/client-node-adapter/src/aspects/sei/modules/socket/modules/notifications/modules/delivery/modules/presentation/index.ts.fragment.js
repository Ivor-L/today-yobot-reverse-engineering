// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/delivery/modules/presentation/index.ts.
// The original TypeScript and import graph are not restored.





class DesktopNotificationPresentation extends readonly_events_ReadonlyEvents {
    dismissAll() {
        const notifications = [
            ...this.presented.values()
        ];
        this.presented.clear();
        for (const notification of notifications){
            this.closeSafely(notification);
        }
    }
    isSupported() {
        return external_electron_.Notification.isSupported();
    }
    present(notification) {
        this.replaceExisting(notification.id);
        const shown = new external_electron_.Notification({
            id: notification.id,
            ...notification.groupId === undefined ? {} : {
                groupId: notification.groupId
            },
            title: notification.title,
            ...notification.subtitle === undefined ? {} : {
                subtitle: notification.subtitle
            },
            ...notification.body === undefined ? {} : {
                body: notification.body
            },
            silent: notification.silent
        });
        this.presented.set(notification.id, shown);
        const release = ()=>{
            if (this.presented.get(notification.id) === shown) {
                this.presented.delete(notification.id);
            }
        };
        shown.on('click', ()=>{
            release();
            this.emit('activated', Object.freeze({
                id: notification.id
            }));
        });
        shown.on('close', release);
        shown.on('failed', (_event, error)=>{
            release();
            this.emit('failed', Object.freeze({
                id: notification.id,
                reason: typeof error === 'string' ? error : ''
            }));
        });
        try {
            shown.show();
        } catch (error) {
            release();
            throw error;
        }
    }
    closeSafely(notification) {
        try {
            notification.close();
        } catch (error) {
            console.warn('[desktop] failed to close a notification', error);
        }
    }
    replaceExisting(id) {
        const existing = this.presented.get(id);
        if (!existing) {
            return;
        }
        this.presented.delete(id);
        this.closeSafely(existing);
    }
    constructor(...args){
        super(...args), this.presented = new Map();
    }
}
DesktopNotificationPresentation = __decorate([
    injectable()
], DesktopNotificationPresentation);
