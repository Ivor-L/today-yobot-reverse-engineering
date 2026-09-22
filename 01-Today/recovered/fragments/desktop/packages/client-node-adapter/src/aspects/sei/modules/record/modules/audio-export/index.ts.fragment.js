// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/audio-export/index.ts.
// The original TypeScript and import graph are not restored.















class RecordAudioExport {
    async export(job, isCurrent) {
        if (this.exporting) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Conflict, 'An audio export is already in progress.');
        }
        this.exporting = true;
        let temporaryPath;
        try {
            this.assertCurrent(isCurrent);
            if (!job.runs.some((run)=>run.segments.length > 0)) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, 'No local audio is available to export.');
            }
            const result = await external_electron_.dialog.showSaveDialog({
                defaultPath: `today-recording-${job.startedAtEpochMs}.zip`,
                filters: [
                    {
                        name: 'ZIP',
                        extensions: [
                            'zip'
                        ]
                    }
                ]
            });
            this.assertCurrent(isCurrent);
            if (result.canceled || !result.filePath) {
                throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Audio export was cancelled.');
            }
            temporaryPath = (0,external_node_path_namespaceObject.join)((0,external_node_path_namespaceObject.dirname)(result.filePath), `.today-recording-${(0,external_node_crypto_namespaceObject.randomUUID)()}.tmp`);
            await this.writeArchive(job, temporaryPath, isCurrent);
            this.assertCurrent(isCurrent);
            await (0,promises_namespaceObject.rename)(temporaryPath, result.filePath);
        } catch (error) {
            if (error instanceof interface_error_InterfaceError) {
                throw error;
            }
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The local audio could not be exported.');
        } finally{
            if (temporaryPath) {
                try {
                    await (0,promises_namespaceObject.rm)(temporaryPath, {
                        force: true
                    });
                } catch  {
                // Cleanup cannot replace the export result or expose a private filesystem path.
                }
            }
            this.exporting = false;
        }
    }
    async writeArchive(job, destination, isCurrent) {
        const output = (0,external_node_fs_namespaceObject.createWriteStream)(destination, {
            flags: 'wx',
            mode: 384
        });
        const archive = new ZipArchive({
            store: true
        });
        const outputClosed = new Promise((resolve)=>{
            output.once('close', resolve);
        });
        archive.on('error', (error)=>{
            output.destroy(error);
        });
        output.on('error', (error)=>{
            archive.destroy(error);
        });
        archive.pipe(output);
        try {
            await Promise.all([
                this.appendSegments(archive, job, isCurrent),
                (0,external_node_stream_promises_namespaceObject.finished)(output)
            ]);
        } catch (error) {
            archive.abort();
            output.destroy();
            await outputClosed;
            throw error;
        }
    }
    async appendSegments(archive, job, isCurrent) {
        for (const [runIndex, run] of job.runs.entries()){
            const segments = [
                ...run.segments
            ].sort((left, right)=>left.sequenceNo - right.sequenceNo);
            for (const segment of segments){
                this.assertCurrent(isCurrent);
                const snapshot = await this.store.readSegmentForUpload(job.sessionId, run.runId, segment);
                this.assertCurrent(isCurrent);
                const extension = segment.contentType === 'audio/ogg' ? 'ogg' : 'flac';
                const name = `run-${String(runIndex + 1).padStart(4, '0')}/segment-${String(segment.sequenceNo + 1).padStart(6, '0')}.${extension}`;
                const appended = (0,external_node_events_namespaceObject.once)(archive, 'entry');
                archive.append(snapshot.bytes, {
                    name
                });
                // Keep at most one verified segment queued while the archive streams to disk.
                await appended;
            }
        }
        this.assertCurrent(isCurrent);
        await archive.finalize();
    }
    assertCurrent(isCurrent) {
        if (!isCurrent()) {
            throw interface_error_InterfaceError(base_InterfaceErrorCode.Cancelled, 'Audio export was cancelled.');
        }
    }
    constructor(){
        this.exporting = false;
    }
}
__decorate([
    inject(RecordStore),
    __metadata("design:type", typeof RecordStore === "undefined" ? Object : RecordStore)
], RecordAudioExport.prototype, "store", void 0);
RecordAudioExport = __decorate([
    injectable()
], RecordAudioExport);
