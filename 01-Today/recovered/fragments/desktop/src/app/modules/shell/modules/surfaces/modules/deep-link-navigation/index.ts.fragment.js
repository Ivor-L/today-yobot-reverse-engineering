// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/deep-link-navigation/index.ts.
// The original TypeScript and import graph are not restored.




class ShellDeepLinkNavigation {
    request(url) {
        const event = Object.freeze({
            url
        });
        if (this.events.listenerCount('deepLinkRequested') === 0) {
            this.pending = event;
            return;
        }
        this.pending = undefined;
        this.events.emit('deepLinkRequested', event);
    }
    async subscribe(eventName, listener) {
        const safeListener = (event)=>{
            try {
                listener(event);
            } catch  {
            // A Web observer cannot fail or block a host-owned navigation request.
            }
        };
        this.events.on(eventName, safeListener);
        const pending = this.pending;
        if (pending) {
            this.pending = undefined;
            safeListener(pending);
        }
        return Object.freeze({
            unsubscribe: async ()=>{
                this.events.off(eventName, safeListener);
            }
        });
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
    }
}
ShellDeepLinkNavigation = __decorate([
    injectable()
], ShellDeepLinkNavigation);
