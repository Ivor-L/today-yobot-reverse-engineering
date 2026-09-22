// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/store/index.ts.
// The original TypeScript and import graph are not restored.











class ToolAuthorizationStore {
    async read(scope) {
        const value = await this.readFile(scope, TOOL_AUTHORIZATION_DIRECTORY);
        if (value === undefined) {
            return null;
        }
        const record = parseToolAuthorization(value);
        if (!record) {
            throw interface_error_InterfaceError(new Error('Invalid authorization version or state'), 'Local connector access could not be read.');
        }
        return record;
    }
    async readLegacy(scope) {
        return parseLegacyAuthorization(await this.readFile(scope, LEGACY_TOOL_AUTHORIZATION_DIRECTORY, true));
    }
    async readFile(scope, directory, legacy = false) {
        try {
            return JSON.parse(await (0,promises_namespaceObject.readFile)(this.filePath(scope, directory), 'utf8'));
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT' || legacy && error instanceof SyntaxError) {
                return undefined;
            }
            throw interface_error_InterfaceError(error, 'Local connector access could not be read.');
        }
    }
    filePath(scope, directory = TOOL_AUTHORIZATION_DIRECTORY) {
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.preferences.settingsPath), directory, `${toolAuthorizationScopeKey(scope)}.json`);
    }
    async write(scope, record) {
        const filePath = this.filePath(scope);
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        this.temporaryFileSequence += 1;
        const temporaryPath = `${filePath}.${process.pid}.${this.temporaryFileSequence}.tmp`;
        const state = {
            version: 2,
            ...record
        };
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(state)}\n`, {
                encoding: 'utf8',
                mode: 384
            });
            await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
        } catch (error) {
            try {
                await (0,promises_namespaceObject.rm)(temporaryPath, {
                    force: true
                });
            } catch  {}
            throw interface_error_InterfaceError(error, 'Local connector access could not be saved.');
        }
    }
    constructor(){
        this.temporaryFileSequence = 0;
    }
}
__decorate([
    inject(PreferencesShellService),
    __metadata("design:type", typeof PreferencesShellService === "undefined" ? Object : PreferencesShellService)
], ToolAuthorizationStore.prototype, "preferences", void 0);
ToolAuthorizationStore = __decorate([
    injectable()
], ToolAuthorizationStore);
