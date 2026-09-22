// Compiled fragment from ../../packages/client-node-adapter/src/aspects/wei/modules/shell/utils.ts.
// The original TypeScript and import graph are not restored.

const createNoopSubscription = async ()=>Object.freeze({
        unsubscribe: async ()=>undefined
    });
const isAllowedExternalUrl = (value)=>{
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch  {
        return false;
    }
};
const isValidSurfaceSize = (params)=>Number.isSafeInteger(params.width) && params.width > 0 && Number.isSafeInteger(params.height) && params.height > 0;
