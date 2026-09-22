// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/delivery/modules/deduplicator/index.ts.
// The original TypeScript and import graph are not restored.




class NotificationDeduplicator {
    register(notificationId) {
        const now = Date.now();
        const existing = this.entries.get(notificationId);
        if (existing && existing.expiresAt > now) {
            return false;
        }
        if (existing) {
            this.entries.delete(notificationId);
        }
        this.entries.set(notificationId, {
            expiresAt: now + (/* inlined export .NOTIFICATION_DEDUP_TTL_MS */300000)
        });
        this.evictIfNeeded(now);
        return true;
    }
    clear() {
        this.entries.clear();
    }
    evictIfNeeded(now) {
        if (this.entries.size <= (/* inlined export .NOTIFICATION_DEDUP_CAPACITY */256)) {
            return;
        }
        for (const [id, entry] of this.entries){
            if (this.entries.size <= (/* inlined export .NOTIFICATION_DEDUP_CAPACITY */256)) {
                return;
            }
            if (entry.expiresAt <= now) {
                this.entries.delete(id);
            }
        }
        while(this.entries.size > (/* inlined export .NOTIFICATION_DEDUP_CAPACITY */256)){
            const oldest = this.entries.keys().next().value;
            if (oldest === undefined) {
                return;
            }
            this.entries.delete(oldest);
        }
    }
    constructor(){
        this.entries = new Map();
    }
}
NotificationDeduplicator = __decorate([
    injectable()
], NotificationDeduplicator);
