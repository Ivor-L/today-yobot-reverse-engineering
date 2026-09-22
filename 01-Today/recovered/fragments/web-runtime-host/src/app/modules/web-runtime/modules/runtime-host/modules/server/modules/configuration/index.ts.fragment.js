// Compiled fragment from ./src/app/modules/web-runtime/modules/runtime-host/modules/server/modules/configuration/index.ts.
// The original TypeScript and import graph are not restored.





class DesktopWebRuntimeServerConfiguration {
    async read(runtimeDirectory) {
        const manifestPath = (0,external_node_path_namespaceObject.join)(runtimeDirectory, '.next', 'required-server-files.json');
        const manifest = JSON.parse(await (0,promises_namespaceObject.readFile)(manifestPath, 'utf8'));
        if (!manifest.config || typeof manifest.config !== 'object' || Array.isArray(manifest.config)) {
            throw new Error(`Packaged Next runtime configuration is invalid: ${manifestPath}`);
        }
        return manifest.config;
    }
}
DesktopWebRuntimeServerConfiguration = __decorate([
    injectable()
], DesktopWebRuntimeServerConfiguration);
