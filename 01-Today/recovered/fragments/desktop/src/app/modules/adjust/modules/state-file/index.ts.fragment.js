// Compiled fragment from ./src/app/modules/adjust/modules/state-file/index.ts.
// The original TypeScript and import graph are not restored.









class DesktopAdjustStateFile {
    async read(fileName) {
        const filePath = this.resolvePath(fileName);
        let contents;
        try {
            contents = await (0,promises_namespaceObject.readFile)(filePath);
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
                return undefined;
            }
            throw error;
        }
        if (contents.length === 0 || contents.length > (/* inlined export .ADJUST_STATE_FILE_MAX_BYTES */131072)) {
            throw new Error('The persisted Adjust state has an invalid size.');
        }
        try {
            return JSON.parse(contents.toString('utf8'));
        } catch (error) {
            throw new Error('The persisted Adjust state is unreadable.', {
                cause: error
            });
        }
    }
    async write(fileName, value) {
        const contents = `${JSON.stringify(value)}\n`;
        if (Buffer.byteLength(contents, 'utf8') > (/* inlined export .ADJUST_STATE_FILE_MAX_BYTES */131072)) {
            throw new Error('The persisted Adjust state is too large.');
        }
        const filePath = this.resolvePath(fileName);
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
                await file.writeFile(contents, 'utf8');
                await file.sync();
            } finally{
                await file.close();
            }
            await (0,promises_namespaceObject.chmod)(temporaryPath, 384);
            (0,external_node_fs_namespaceObject.renameSync)(temporaryPath, filePath);
            committed = true;
        } finally{
            if (!committed) {
                try {
                    await (0,promises_namespaceObject.rm)(temporaryPath, {
                        force: true
                    });
                } catch  {
                // Preserve the original atomic-write failure.
                }
            }
        }
    }
    resolvePath(fileName) {
        if (!/^[a-z0-9-]+\.json$/u.test(fileName)) {
            throw new TypeError('The Adjust state file name is invalid.');
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
], DesktopAdjustStateFile.prototype, "configuration", void 0);
DesktopAdjustStateFile = __decorate([
    injectable()
], DesktopAdjustStateFile);
