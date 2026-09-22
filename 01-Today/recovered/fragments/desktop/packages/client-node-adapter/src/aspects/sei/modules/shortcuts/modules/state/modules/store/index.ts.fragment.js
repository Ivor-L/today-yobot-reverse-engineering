// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/state/modules/store/index.ts.
// The original TypeScript and import graph are not restored.






class ShortcutsStore {
    async read(filePath) {
        try {
            const contents = await (0,promises_namespaceObject.readFile)(filePath, 'utf8');
            return parsePersistedShortcuts(JSON.parse(contents));
        } catch (error) {
            if (utils_isFileNotFoundError(error) || error instanceof SyntaxError) {
                return {
                    bindings: {},
                    migrations: []
                };
            }
            throw error;
        }
    }
    async write(filePath, shortcuts) {
        await (0,promises_namespaceObject.mkdir)((0,external_node_path_namespaceObject.dirname)(filePath), {
            recursive: true
        });
        const temporaryPath = `${filePath}.tmp`;
        try {
            await (0,promises_namespaceObject.writeFile)(temporaryPath, `${JSON.stringify(shortcuts, null, 2)}\n`, 'utf8');
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
ShortcutsStore = __decorate([
    injectable()
], ShortcutsStore);
