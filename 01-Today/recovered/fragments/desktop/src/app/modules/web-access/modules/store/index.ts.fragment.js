// Compiled fragment from ./src/app/modules/web-access/modules/store/index.ts.
// The original TypeScript and import graph are not restored.











class DesktopWebAccessStore {
    async read(environment) {
        const filePath = this.resolveFilePath(environment);
        let encrypted;
        try {
            encrypted = await (0,promises_namespaceObject.readFile)(filePath);
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return undefined;
            }
            throw error;
        }
        if (encrypted.length === 0 || encrypted.length > (/* inlined export .MAX_WEB_ACCESS_STATE_BYTES */65536)) {
            return undefined;
        }
        this.assertEncryptionAvailable();
        let decrypted;
        try {
            decrypted = external_electron_.safeStorage.decryptString(encrypted);
        } catch  {
            return undefined;
        }
        if (Buffer.byteLength(decrypted, 'utf8') > (/* inlined export .MAX_WEB_ACCESS_STATE_BYTES */65536)) {
            return undefined;
        }
        try {
            return parsePersistedWebAccessState(JSON.parse(decrypted), environment)?.bypassSecret;
        } catch  {
            return undefined;
        }
    }
    async write(environment, value, shouldCommit = ()=>true) {
        const bypassSecret = normalizeVercelBypassSecret(value);
        if (!bypassSecret) {
            throw new TypeError('The Vercel bypass value is invalid.');
        }
        this.assertEncryptionAvailable();
        const state = {
            bypassSecret,
            environment,
            schemaVersion: (/* inlined export .WEB_ACCESS_STATE_SCHEMA_VERSION */1)
        };
        const encrypted = external_electron_.safeStorage.encryptString(JSON.stringify(state));
        if (encrypted.length === 0 || encrypted.length > (/* inlined export .MAX_WEB_ACCESS_STATE_BYTES */65536)) {
            throw new Error('The encrypted Web access state has an invalid size.');
        }
        const filePath = this.resolveFilePath(environment);
        const directory = (0,external_node_path_namespaceObject.dirname)(filePath);
        this.temporaryFileSequence += 1;
        const temporaryPath = `${filePath}.${process.pid}.${this.temporaryFileSequence}.tmp`;
        await (0,promises_namespaceObject.mkdir)(directory, {
            recursive: true,
            mode: 448
        });
        let committed = false;
        try {
            await (0,promises_namespaceObject.rm)(temporaryPath, {
                force: true
            });
            const file = await (0,promises_namespaceObject.open)(temporaryPath, 'wx', 384);
            try {
                await file.writeFile(encrypted);
                await file.sync();
            } finally{
                await file.close();
            }
            await (0,promises_namespaceObject.chmod)(temporaryPath, 384);
            if (!shouldCommit()) {
                return false;
            }
            try {
                (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, filePath);
            } catch (error) {
                const destinationConflict = error instanceof Error && 'code' in error && (error.code === 'EEXIST' || error.code === 'EPERM');
                if (!destinationConflict) {
                    throw error;
                }
                if (!shouldCommit()) {
                    return false;
                }
                (0,external_node_fs_namespaceObject.rmSync)(filePath, {
                    force: true
                });
                (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, filePath);
            }
            committed = true;
            return true;
        } finally{
            if (!committed) {
                try {
                    await (0,promises_namespaceObject.rm)(temporaryPath, {
                        force: true
                    });
                } catch  {
                // Preserve the original write result.
                }
            }
        }
    }
    assertEncryptionAvailable() {
        if (!external_electron_.safeStorage.isEncryptionAvailable()) {
            throw new Error('Electron safeStorage is unavailable for Web access state.');
        }
        if (process.platform === 'linux' && external_electron_.safeStorage.getSelectedStorageBackend() === 'basic_text') {
            throw new Error('The insecure Linux safeStorage backend cannot store Web access state.');
        }
    }
    resolveFilePath(environment) {
        if (!isSupportedWebAccessEnvironment(environment)) {
            throw new TypeError(`Unsupported Web access environment: ${environment}`);
        }
        const fileName = WEB_ACCESS_STATE_FILE_NAMES[environment];
        if (!fileName) {
            throw new TypeError(`Unsupported Web access environment: ${environment}`);
        }
        return (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(this.configuration.current.settingsPath), fileName);
    }
    constructor(){
        this.temporaryFileSequence = 0;
    }
}
__decorate([
    inject(DesktopConfiguration),
    __metadata("design:type", typeof DesktopConfiguration === "undefined" ? Object : DesktopConfiguration)
], DesktopWebAccessStore.prototype, "configuration", void 0);
DesktopWebAccessStore = __decorate([
    injectable()
], DesktopWebAccessStore);
