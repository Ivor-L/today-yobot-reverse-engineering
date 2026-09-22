// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/modifier-gesture/index.ts.
// The original TypeScript and import graph are not restored.



class ShellModifierGestures {
    /**
   * Supplied by the Desktop composition root once the Node Adapter exists,
   * mirroring how the Shell Adapter is attached: the shortcut host has to be
   * constructed before the Adapter it later reads CPI from.
   */ attach(cpi) {
        this.cpi = cpi;
    }
    /**
   * Takes one physical lease. `gestureId` must be unique per lease so that a
   * previous lease's asynchronous release can never affect this one.
   */ async register(gestureId, binding, listener) {
        const cpi = this.cpi;
        if (!cpi) {
            return false;
        }
        // The listener is installed before anything can emit: Native may complete the
        // gesture between the register call and its acknowledgement, and a concurrent
        // release of another lease must see this lease as already held so it does not
        // drop the shared subscription. Both are rolled back when the lease fails.
        this.listeners.set(gestureId, listener);
        try {
            await this.ensureSubscribed(cpi);
            await cpi.macos.registerModifierGesture({
                gestureId,
                binding
            });
        } catch (error) {
            console.error('[desktop] failed to register a modifier gesture', error);
            this.listeners.delete(gestureId);
            await this.releaseSubscriptionIfIdle();
            return false;
        }
        return true;
    }
    async unregister(gestureId) {
        this.listeners.delete(gestureId);
        const cpi = this.cpi;
        if (cpi) {
            try {
                await cpi.macos.unregisterModifierGesture({
                    gestureId
                });
            } catch (error) {
                console.error('[desktop] failed to release a modifier gesture', error);
            }
        }
        await this.releaseSubscriptionIfIdle();
    }
    async ensureSubscribed(cpi) {
        if (this.subscription) {
            return;
        }
        if (this.subscribing) {
            await this.subscribing;
            return;
        }
        const subscribing = this.subscribe(cpi);
        this.subscribing = subscribing;
        try {
            await subscribing;
        } finally{
            if (this.subscribing === subscribing) {
                this.subscribing = undefined;
            }
        }
    }
    async subscribe(cpi) {
        const subscription = await cpi.macos.subscribe('modifierGestureTriggered', this.handleTriggered);
        if (this.subscription) {
            await this.release(subscription);
            return;
        }
        this.subscription = subscription;
    }
    async releaseSubscriptionIfIdle() {
        if (this.listeners.size > 0) {
            return;
        }
        await this.releaseSubscription();
    }
    async releaseSubscription() {
        const subscription = this.subscription;
        this.subscription = undefined;
        if (subscription) {
            await this.release(subscription);
        }
    }
    async release(subscription) {
        try {
            await subscription.unsubscribe();
        } catch  {
        // Subscription cleanup is best-effort during teardown.
        }
    }
    constructor(){
        this.listeners = new Map();
        this.handleTriggered = (event)=>{
            this.listeners.get(event.gestureId)?.();
        };
    }
}
ShellModifierGestures = __decorate([
    injectable()
], ShellModifierGestures);
