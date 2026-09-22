// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account-session-barrier/index.ts.
// The original TypeScript and import graph are not restored.




class AccountSessionBarrier {
    get suspended() {
        return this.leases.size > 0;
    }
    suspend() {
        const token = Symbol('account-session-barrier');
        const notifySuspended = this.leases.size === 0;
        this.leases.add(token);
        if (notifySuspended) {
            try {
                this.emitSuspended();
            } catch (error) {
                this.leases.delete(token);
                if (this.leases.size === 0) {
                    this.emitAvailable();
                }
                throw error;
            }
        }
        let released = false;
        return Object.freeze({
            release: ()=>{
                if (released) {
                    return;
                }
                released = true;
                const deleted = this.leases.delete(token);
                if (deleted && this.leases.size === 0) {
                    this.emitAvailable();
                }
            }
        });
    }
    onSuspended(listener) {
        this.events.on('suspended', listener);
        return ()=>{
            this.events.off('suspended', listener);
        };
    }
    onAvailable(listener) {
        this.events.on('available', listener);
        return ()=>{
            this.events.off('available', listener);
        };
    }
    emitSuspended() {
        let failure;
        for (const listener of this.events.listeners('suspended')){
            try {
                listener();
            } catch (error) {
                failure ??= error;
            }
        }
        if (failure !== undefined) {
            throw failure;
        }
    }
    emitAvailable() {
        for (const listener of this.events.listeners('available')){
            try {
                listener();
            } catch  {
            // Availability observers cannot reject an already completed account transaction.
            }
        }
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
        this.leases = new Set();
    }
}
AccountSessionBarrier = __decorate([
    injectable()
], AccountSessionBarrier);
