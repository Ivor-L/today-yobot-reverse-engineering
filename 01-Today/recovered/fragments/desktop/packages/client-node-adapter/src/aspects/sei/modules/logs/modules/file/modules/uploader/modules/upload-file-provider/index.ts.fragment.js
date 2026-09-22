// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/modules/uploader/modules/upload-file-provider/index.ts.
// The original TypeScript and import graph are not restored.





class FileLogUploadFileProvider {
    async create(path, fileName, onProgress) {
        const blob = await (0,external_node_fs_namespaceObject.openAsBlob)(path, {
            type: 'application/zip'
        });
        return new FileLogUploadFile(blob, fileName, onProgress);
    }
}
FileLogUploadFileProvider = __decorate([
    injectable()
], FileLogUploadFileProvider);
