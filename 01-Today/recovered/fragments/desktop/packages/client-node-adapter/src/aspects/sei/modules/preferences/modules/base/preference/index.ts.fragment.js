// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/base/preference/index.ts.
// The original TypeScript and import graph are not restored.






class PreferenceShellItem {
    get available() {
        return true;
    }
    get value() {
        const value = this.currentValue;
        if (!this.initialized || value === undefined) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The preference value is not available.');
        }
        return value;
    }
    getInfo() {
        return Object.freeze({
            id: this.id,
            value: this.value,
            debugOnly: this.debugOnly,
            available: this.available,
            writable: this.writable
        });
    }
    async initialize() {
        if (this.initialized) {
            return;
        }
        if (this.initialization) {
            await this.initialization;
            return;
        }
        const initialization = this.load();
        this.initialization = initialization;
        try {
            await initialization;
        } finally{
            if (this.initialization === initialization) {
                this.initialization = undefined;
            }
        }
    }
    async prepareValueUpdate() {
        await this.initialize();
        if (!this.available) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unsupported, `The preference "${this.id}" is not supported.`);
        }
        if (!this.writable) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, `The preference "${this.id}" is read-only.`);
        }
    }
    subscribeChanged(listener) {
        this.events.on('changed', listener);
        return ()=>{
            this.events.off('changed', listener);
        };
    }
    updateCurrentValue(value) {
        if (Object.is(this.currentValue, value)) {
            return;
        }
        this.currentValue = value;
        this.events.emit('changed', this.getInfo());
    }
    async load() {
        const value = await this.loadValue();
        this.currentValue = value;
        this.initialized = true;
    }
    constructor(){
        this.events = new node_modules_eventemitter3();
        this.initialized = false;
    }
}
PreferenceShellItem = __decorate([
    injectable()
], PreferenceShellItem);
