// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/state/modules/store/index.ts.
// The original TypeScript and import graph are not restored.






class PreferencesStore {
    async read(filePath, defaultEnvironment) {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(filePath, 'utf8');
            return parsePersistedPreferences(JSON.parse(contents), defaultEnvironment);
        } catch (error) {
            if (isFileNotFoundError(error) || error instanceof SyntaxError) {
                return {
                    environment: defaultEnvironment
                };
            }
            throw error;
        }
    }
    async write(filePath, preferences) {
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        const temporaryPath = `${filePath}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(preferences, null, 2)}\n`, 'utf8');
            await (0,promises_namespaceObject.rename)(temporaryPath, filePath);
        } catch (error) {
            try {
                await (0,promises_namespaceObject.rm)(temporaryPath, {
                    force: true
                });
            } catch  {
            // Preserve the primary persistence failure.
            }
            throw error;
        }
    }
}
PreferencesStore = __decorate([
    injectable()
], PreferencesStore);
