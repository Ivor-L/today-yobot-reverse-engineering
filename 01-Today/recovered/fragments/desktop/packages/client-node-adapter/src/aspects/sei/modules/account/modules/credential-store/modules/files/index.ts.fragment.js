// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/modules/files/index.ts.
// The original TypeScript and import graph are not restored.











class AccountCredentialFiles {
    async hasTombstone() {
        const paths = getCredentialPaths(this.path);
        return await pathExists(paths.tombstone);
    }
    async hasCredentials() {
        const paths = getCredentialPaths(this.path);
        const credentials = [
            paths.head,
            ...paths.slots
        ].flatMap((path)=>[
                path,
                `${path}.tmp`
            ]);
        const exists = await Promise.all(credentials.map(async (path)=>await pathExists(path)));
        return exists.some(Boolean);
    }
    async readHead() {
        const paths = getCredentialPaths(this.path);
        return await this.read(paths.head);
    }
    async readSlot(index) {
        const paths = getCredentialPaths(this.path);
        return await this.read(paths.slots[index]);
    }
    async writeHead(contents) {
        const paths = getCredentialPaths(this.path);
        await this.writeAtomic(paths.head, contents);
    }
    async writeSlot(index, contents) {
        const paths = getCredentialPaths(this.path);
        await this.writeAtomic(paths.slots[index], contents);
    }
    async ensureTombstone() {
        const paths = getCredentialPaths(this.path);
        if (await pathExists(paths.tombstone)) {
            return;
        }
        await this.writeAtomic(paths.tombstone, Buffer.from(TOMBSTONE_CONTENT, 'utf8'));
    }
    async removeTombstone() {
        const paths = getCredentialPaths(this.path);
        try {
            await (0,promises_namespaceObject.rm)(paths.tombstone, {
                force: true
            });
            await syncDirectory((0,external_node_path_namespaceObject.dirname)(this.path));
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
    }
    async clear() {
        const paths = getCredentialPaths(this.path);
        await this.ensureTombstone();
        try {
            await Promise.all([
                ...paths.slots,
                paths.head
            ].flatMap((path)=>[
                    (0,promises_namespaceObject.rm)(path, {
                        force: true
                    }),
                    (0,promises_namespaceObject.rm)(`${path}.tmp`, {
                        force: true
                    })
                ]));
            await syncDirectory((0,external_node_path_namespaceObject.dirname)(this.path));
        } catch (error) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
    }
    async read(path) {
        try {
            return await (0,promises_namespaceObject.readFile)(path);
        } catch (error) {
            if (hasFileErrorCode(error, 'ENOENT')) {
                return null;
            }
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
    }
    async writeAtomic(path, contents) {
        const directory = (0,external_node_path_namespaceObject.dirname)(path);
        const temporary = `${path}.tmp`;
        try {
            await (0,promises_namespaceObject.mkdir)(directory, {
                recursive: true,
                mode: 448
            });
            await (0,promises_namespaceObject.rm)(temporary, {
                force: true
            });
            const file = await (0,promises_namespaceObject.open)(temporary, 'wx', 384);
            try {
                await file.writeFile(contents);
                await file.sync();
            } finally{
                await file.close();
            }
            await (0,promises_namespaceObject.chmod)(temporary, 384);
            await (0,promises_namespaceObject.rm)(path, {
                force: true
            });
            await (0,promises_namespaceObject.rename)(temporary, path);
            await syncDirectory(directory);
        } catch (error) {
            try {
                await (0,promises_namespaceObject.rm)(temporary, {
                    force: true
                });
            } catch  {}
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, STORAGE_UNAVAILABLE_MESSAGE, {
                cause: error
            });
        }
    }
    get path() {
        return (0,external_node_path_namespaceObject.join)(external_electron_.app.getPath('userData'), CREDENTIAL_BASE_NAME);
    }
}
AccountCredentialFiles = __decorate([
    injectable()
], AccountCredentialFiles);
