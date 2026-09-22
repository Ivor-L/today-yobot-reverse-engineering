// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/record/modules/store/modules/validation-error/index.ts.
// The original TypeScript and import graph are not restored.

class RecordStoreValidationError extends Error {
    constructor(code, message, options){
        super(message, options), this.code = code, this.terminal = true;
        this.name = 'RecordStoreValidationError';
    }
}
