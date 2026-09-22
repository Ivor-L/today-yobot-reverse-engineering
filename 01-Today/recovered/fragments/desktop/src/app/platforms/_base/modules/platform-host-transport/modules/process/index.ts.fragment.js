// Compiled fragment from ./src/app/platforms/_base/modules/platform-host-transport/modules/process/index.ts.
// The original TypeScript and import graph are not restored.




class PlatformHostProcess {
    spawn({ binaryPath, environment }) {
        return (0,external_node_child_process_namespaceObject.spawn)(binaryPath, [], {
            env: environment,
            stdio: [
                'pipe',
                'pipe',
                'pipe'
            ]
        });
    }
}
PlatformHostProcess = __decorate([
    injectable()
], PlatformHostProcess);
