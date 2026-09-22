// Compiled fragment from ./src/app/modules/shell/modules/quit-state/index.ts.
// The original TypeScript and import graph are not restored.



class ShellQuitState {
    get isQuitting() {
        return this.quitting;
    }
    begin() {
        this.quitting = true;
    }
    cancel() {
        this.quitting = false;
    }
    constructor(){
        this.quitting = false;
    }
}
ShellQuitState = __decorate([
    injectable()
], ShellQuitState);
