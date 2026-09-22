// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/runtime/index.ts.
// The original TypeScript and import graph are not restored.





class PreferencesRuntimeProvider {
    get current() {
        if (!this.value) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'The preferences runtime is not available.');
        }
        return this.value;
    }
    configure(configuration) {
        if (this.value) {
            return;
        }
        this.value = {
            ...configuration
        };
    }
}
PreferencesRuntimeProvider = __decorate([
    injectable()
], PreferencesRuntimeProvider);
