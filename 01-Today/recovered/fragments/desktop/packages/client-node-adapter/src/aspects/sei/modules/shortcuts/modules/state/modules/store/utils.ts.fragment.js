// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/shortcuts/modules/state/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.


const utils_isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const EMPTY_PERSISTED_SHORTCUTS = {
    bindings: {},
    migrations: []
};
const parseMigrations = (value)=>{
    if (!Array.isArray(value)) {
        return [];
    }
    return [
        ...new Set(value.filter((migration)=>typeof migration === 'string' && migration.trim() === migration && migration.length > 0))
    ];
};
const parsePersistedShortcuts = (value)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value) || !('bindings' in value) || typeof value.bindings !== 'object' || value.bindings === null || Array.isArray(value.bindings)) {
        return EMPTY_PERSISTED_SHORTCUTS;
    }
    const migrations = parseMigrations('migrations' in value ? value.migrations : undefined);
    const bindings = {};
    for (const [id, binding] of Object.entries(value.bindings)){
        if (!id.trim() || id.trim() !== id) {
            continue;
        }
        if (binding === null) {
            bindings[id] = null;
            continue;
        }
        try {
            bindings[id] = normalizeShortcutBinding(binding);
        } catch  {
        // Ignore only the malformed persisted item; other valid items remain usable.
        }
    }
    return {
        bindings,
        migrations
    };
};
