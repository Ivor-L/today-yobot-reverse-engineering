// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/rpc/utils.ts.
// The original TypeScript and import graph are not restored.

const deliverSafely = async (listener, payload)=>{
    try {
        await listener(payload);
    } catch  {
    // One debug consumer must not prevent delivery to the others.
    }
};
