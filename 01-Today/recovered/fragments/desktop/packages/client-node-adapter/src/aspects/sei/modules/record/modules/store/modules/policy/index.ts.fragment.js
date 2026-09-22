// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/store/modules/policy/index.ts.
// The original TypeScript and import graph are not restored.



const RECORD_DIRECTORY_MODE = 448;
const RECORD_FILE_MODE = 384;
class RecordStorePolicy {
    constructor(){
        this.maximumManifestBytes = 1024 * 1024;
        this.maximumSegmentBytes = 16 * 1024 * 1024;
        this.maximumJobBytes = 2 * 1024 * 1024 * 1024;
        this.maximumSpoolBytes = 5 * 1024 * 1024 * 1024;
        this.maximumJobDurationMs = 4 * 60 * 60 * 1000;
        this.maximumSpoolDurationMs = 16 * this.maximumJobDurationMs;
        this.maximumJobs = 16;
        this.maximumRunsPerJob = 1024;
        this.maximumSegmentsPerJob = 4096;
        this.jobRetentionMs = 7 * 24 * 60 * 60 * 1000;
        this.staleArtifactRetentionMs = 24 * 60 * 60 * 1000;
    }
}
RecordStorePolicy = __decorate([
    injectable()
], RecordStorePolicy);
