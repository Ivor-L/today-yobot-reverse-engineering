// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/consts.ts.
// The original TypeScript and import graph are not restored.

const RECORD_AUDIO_SEGMENT_DURATION_MS = 20000;
const RECORD_RETRY_DELAY_MS = 30000;
const RECORD_PROCESSING_WAIT_TIMEOUT_MS = 10 * 60 * 1000;
const RECORD_UPLOAD_CONCURRENCY = 2;
const RECORD_MAX_SEGMENT_INTEGRITY_FAILURES = 2;
const RECORD_STATE_DIRECTORY_NAME = 'recordings';
const RECORD_MANIFEST_FILE_NAME = 'manifest.json';
const RECORD_MANIFEST_SCHEMA_VERSION = 2;
const consts_RECORD_SEGMENT_FILE_PATTERN = /^segment-(\d{6})(?:-([0-9a-f]{16})-([0-9a-f]{16})-(\d{1,19}))?\.flac$/;
const RECORD_CAPTURE_STOP_MAX_RETRIES = 5;
const RECORD_CAPTURE_RETRY_INITIAL_DELAY_MS = 1000;
const RECORD_CAPTURE_RETRY_MAX_DELAY_MS = 30000;
