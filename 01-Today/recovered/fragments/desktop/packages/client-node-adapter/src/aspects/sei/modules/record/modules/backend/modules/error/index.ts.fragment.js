// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/backend/modules/error/index.ts.
// The original TypeScript and import graph are not restored.

class RecordBackendError extends Error {
    constructor(code, message, options){
        super(message, {
            cause: options.cause
        });
        this.name = 'RecordBackendError';
        this.code = code;
        this.retryable = options.retryable;
        this.retryPrepare = options.retryPrepare ?? false;
        this.requestDefinitelyRejected = options.requestDefinitelyRejected ?? false;
        this.segmentIntegrityFailure = options.segmentIntegrityFailure ?? false;
        this.businessCode = options.businessCode;
        this.httpStatus = options.httpStatus;
    }
}
