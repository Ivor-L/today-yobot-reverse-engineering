// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file/modules/uploader/modules/upload-file-provider/modules/upload-file/index.ts.
// The original TypeScript and import graph are not restored.

/** Per-attempt file resource; the multipart encoder consumes its stream without buffering it. */ class FileLogUploadFile extends File {
    constructor(blob, fileName, onProgress){
        super([
            blob
        ], fileName, {
            type: 'application/zip'
        });
        this.onProgress = onProgress;
    }
    stream() {
        let uploadedBytes = 0;
        return super.stream().pipeThrough(new TransformStream({
            transform: (chunk, controller)=>{
                uploadedBytes += chunk.byteLength;
                controller.enqueue(chunk);
                try {
                    this.onProgress(Math.min(1, uploadedBytes / Math.max(1, this.size)));
                } catch  {
                // A presentation observer must never interrupt transfer of the archive.
                }
            }
        }));
    }
}
