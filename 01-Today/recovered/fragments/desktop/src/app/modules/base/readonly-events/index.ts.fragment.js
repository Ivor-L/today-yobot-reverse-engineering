// Compiled fragment from ./src/app/modules/base/readonly-events/index.ts.
// The original TypeScript and import graph are not restored.


class base_readonly_events_ReadonlyEvents {
    async subscribe(eventName, listener) {
        const safeListener = async (event)=>{
            try {
                await listener(event);
            } catch  {}
        };
        this.events.on(eventName, safeListener);
        return Object.freeze({
            unsubscribe: async ()=>{
                this.events.off(eventName, safeListener);
            }
        });
    }
    emit(eventName, event) {
        return this.events.emit(eventName, event);
    }
    listenerCount(eventName) {
        return this.events.listenerCount(eventName);
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
    }
}
