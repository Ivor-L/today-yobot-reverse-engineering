// Compiled fragment from ./src/app/modules/shell/modules/surfaces/modules/settings-navigation/index.ts.
// The original TypeScript and import graph are not restored.




class ShellSettingsNavigation {
    request() {
        if (this.events.listenerCount('settingsRequested') === 0) {
            this.pending = true;
            return;
        }
        this.pending = false;
        this.events.emit('settingsRequested', null);
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
        if (this.pending) {
            this.pending = false;
            safeListener(null);
        }
        return Object.freeze({
            unsubscribe: async ()=>{
                this.events.off(eventName, safeListener);
            }
        });
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
        this.pending = false;
    }
}
ShellSettingsNavigation = __decorate([
    injectable()
], ShellSettingsNavigation);
