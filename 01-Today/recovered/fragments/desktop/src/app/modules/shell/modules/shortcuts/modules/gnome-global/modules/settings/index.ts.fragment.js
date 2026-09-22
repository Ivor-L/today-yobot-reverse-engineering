// Compiled fragment from ./src/app/modules/shell/modules/shortcuts/modules/gnome-global/modules/settings/index.ts.
// The original TypeScript and import graph are not restored.







class GnomeShortcutSettings {
    async readPaths() {
        const value = await this.run([
            'get',
            MEDIA_KEYS_SCHEMA,
            'custom-keybindings'
        ]);
        if (!/^(?:@as\s+)?\[[\s\S]*\]$/u.test(value.trim())) {
            throw new Error('GNOME custom shortcut setting did not contain an array');
        }
        return parseGvariantStrings(value);
    }
    async readString(path, key) {
        const values = parseGvariantStrings(await this.run([
            'get',
            `${CUSTOM_SHORTCUT_SCHEMA}:${path}`,
            key
        ]));
        if (values.length !== 1) {
            throw new Error('GNOME shortcut setting did not contain one string');
        }
        return values[0];
    }
    async writeString(path, key, value) {
        await this.run([
            'set',
            `${CUSTOM_SHORTCUT_SCHEMA}:${path}`,
            key,
            JSON.stringify(value)
        ]);
    }
    async writePaths(paths) {
        await this.run([
            'set',
            MEDIA_KEYS_SCHEMA,
            'custom-keybindings',
            JSON.stringify(paths)
        ]);
    }
    async reset(path) {
        await this.run([
            'reset-recursively',
            `${CUSTOM_SHORTCUT_SCHEMA}:${path}`
        ]);
    }
    async readSystemAccelerators() {
        const schemas = new Set((await this.run([
            'list-schemas'
        ])).trim().split(/\r?\n/u));
        const accelerators = [];
        for (const schema of GNOME_SHORTCUT_SCHEMAS){
            if (schemas.has(schema)) {
                accelerators.push(...parseGvariantStrings(await this.run([
                    'list-recursively',
                    schema
                ])));
            }
        }
        return accelerators;
    }
    stop() {
        this.stopped = true;
        this.cancelPending();
    }
    cancelPending() {
        for (const controller of this.pending){
            controller.abort();
        }
    }
    async run(args) {
        if (this.stopped) {
            throw new Error('GNOME shortcut settings have stopped');
        }
        const controller = new AbortController();
        this.pending.add(controller);
        try {
            const result = await (0,external_node_util_namespaceObject.promisify)(external_node_child_process_namespaceObject.execFile)('gsettings', args, {
                encoding: 'utf8',
                timeout: 3000,
                maxBuffer: 1024 * 1024,
                signal: controller.signal
            });
            return result.stdout;
        } catch  {
            // execFile errors include the full argv, which contains private launch
            // paths and the activation token. Do not retain them in a cause either.
            throw new Error('GNOME shortcut settings command failed');
        } finally{
            this.pending.delete(controller);
        }
    }
    constructor(){
        this.pending = new Set();
        this.stopped = false;
    }
}
GnomeShortcutSettings = __decorate([
    injectable()
], GnomeShortcutSettings);
