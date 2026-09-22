// Compiled fragment from ./src/app/modules/application-presence/index.ts.
// The original TypeScript and import graph are not restored.




class ShellApplicationPresence extends base_readonly_events_ReadonlyEvents {
    isFocused() {
        return this.mainWindowFocused || this.quickChatFocused;
    }
    setMainWindowFocused(focused) {
        if (this.mainWindowFocused === focused) {
            return;
        }
        this.mainWindowFocused = focused;
        this.scheduleFocusNotification();
    }
    setQuickChatFocused(focused) {
        if (this.quickChatFocused === focused) {
            return;
        }
        this.quickChatFocused = focused;
        this.scheduleFocusNotification();
    }
    scheduleFocusNotification() {
        if (this.focusNotification !== undefined) {
            return;
        }
        // Window blur precedes the next product window's focus and the host's queued refresh.
        // Publish their settled aggregate so an internal transfer is not an application blur.
        this.focusNotification = setTimeout(()=>{
            this.focusNotification = undefined;
            const focused = this.isFocused();
            if (focused === this.publishedFocus) {
                return;
            }
            this.publishedFocus = focused;
            this.emit('focusChanged', focused);
        }, 0);
    }
    isPresent() {
        return this.mainWindowPresent || this.quickChatPresent;
    }
    setMainWindowPresent(present) {
        if (this.mainWindowPresent === present) {
            return;
        }
        const previous = this.isPresent();
        this.mainWindowPresent = present;
        this.publishIfChanged(previous);
    }
    setQuickChatPresent(present) {
        if (this.quickChatPresent === present) {
            return;
        }
        const previous = this.isPresent();
        this.quickChatPresent = present;
        this.publishIfChanged(previous);
    }
    publishIfChanged(previous) {
        const current = this.isPresent();
        if (current === previous) {
            return;
        }
        this.emit('changed', current);
    }
    constructor(...args){
        super(...args), this.mainWindowPresent = false, this.quickChatPresent = false, this.mainWindowFocused = false, this.quickChatFocused = false, this.publishedFocus = false;
    }
}
ShellApplicationPresence = __decorate([
    injectable()
], ShellApplicationPresence);
