// Compiled fragment from ./src/app/modules/node-network-inspection/modules/compatibility/index.ts.
// The original TypeScript and import graph are not restored.





class DesktopNetworkInspectorCompatibility {
    prepare() {
        if (this.installations.length > 0) {
            return;
        }
        try {
            this.install('dataReceived', normalizeInspectorNetworkDataReceivedEvent);
            this.install('requestWillBeSent', normalizeInspectorNetworkRequestEvent);
        } catch (error) {
            this.dispose();
            throw error;
        }
    }
    dispose() {
        for (const installation of this.installations){
            const current = Object.getOwnPropertyDescriptor(external_node_inspector_.Network, installation.name);
            if (current?.value === installation.replacement) {
                Reflect.defineProperty(external_node_inspector_.Network, installation.name, installation.descriptor);
            }
        }
        this.installations = [];
    }
    install(name, normalize) {
        const descriptor = Object.getOwnPropertyDescriptor(external_node_inspector_.Network, name);
        if (!descriptor || typeof descriptor.value !== 'function') {
            throw new Error(`Node Network.${name} is unavailable`);
        }
        const original = descriptor.value;
        const replacement = (event)=>{
            const normalizedEvent = normalize(event);
            Reflect.apply(original, external_node_inspector_.Network, [
                normalizedEvent
            ]);
        };
        if (!Reflect.defineProperty(external_node_inspector_.Network, name, {
            ...descriptor,
            value: replacement
        })) {
            throw new Error(`Unable to protect Node Network.${name}`);
        }
        this.installations.push({
            name,
            descriptor,
            replacement
        });
    }
    constructor(){
        this.installations = [];
    }
}
DesktopNetworkInspectorCompatibility = __decorate([
    injectable()
], DesktopNetworkInspectorCompatibility);
