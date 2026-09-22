// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/credential-store/utils.ts.
// The original TypeScript and import graph are not restored.




const getNextGeneration = (slots)=>{
    const latest = lodash_es_max(slots.map((slot)=>slot.generation)) ?? -1;
    const generation = latest + 1;
    if (!lodash_es_isSafeInteger(generation)) {
        throw interface_error_InterfaceError(base_InterfaceErrorCode.Internal, 'The account credential generation is exhausted.');
    }
    return generation;
};
const selectSlot = (slots)=>{
    const first = slots[0];
    if (!first) {
        return 0;
    }
    const second = slots[1];
    if (!second) {
        if (first.index === 0) {
            return 1;
        }
        return 0;
    }
    if (first.generation <= second.generation) {
        return first.index;
    }
    return second.index;
};
