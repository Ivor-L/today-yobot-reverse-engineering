// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/features/modules/base/feature/index.ts.
// The original TypeScript and import graph are not restored.



class FeatureShellItem {
    getInfo() {
        const value = this.getValue();
        return Object.freeze({
            id: this.id,
            value,
            ...this.debug ? {
                debug: this.debug,
                defaultValue: this.effectiveValue,
                ...this.overrideValue === undefined ? {} : {
                    overrideValue: this.overrideValue
                }
            } : {}
        });
    }
    async initialize() {}
    async dispose() {}
    reset() {
        if (this.overrideValue === undefined) {
            return;
        }
        const previous = this.getInfo();
        this.overrideValue = undefined;
        this.publishIfChanged(previous);
    }
    setValue(value) {
        const previous = this.getInfo();
        this.overrideValue = this.normalizeValue(value);
        this.publishIfChanged(previous);
    }
    subscribe(listener) {
        this.events.on('changed', listener);
        return ()=>{
            this.events.off('changed', listener);
        };
    }
    setEffectiveValue(value) {
        const previous = this.getInfo();
        this.effectiveValue = this.normalizeValue(value);
        this.effectiveValueInitialized = true;
        this.publishIfChanged(previous);
    }
    getValue() {
        if (this.overrideValue !== undefined) {
            return this.overrideValue;
        }
        if (!this.effectiveValueInitialized) {
            this.effectiveValue = this.normalizeValue(this.getInitialEffectiveValue());
            this.effectiveValueInitialized = true;
        }
        return this.effectiveValue;
    }
    publishIfChanged(previous) {
        const info = this.getInfo();
        if (lodash_es_isEqual(previous, info)) {
            return;
        }
        this.events.emit('changed', info);
    }
    constructor(){
        this.effectiveValueInitialized = false;
        this.events = new node_modules_eventemitter3();
    }
}
