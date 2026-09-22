// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/user-socket/utils.ts.
// The original TypeScript and import graph are not restored.


const cloneJsonValue = (value)=>{
    try {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) {
            return undefined;
        }
        return JSON.parse(serialized);
    } catch  {
        return undefined;
    }
};
const getPacketPayload = (event)=>{
    if (event.type === 'socket.parse_error' && typeof event.payload === 'object' && event.payload !== null && 'raw' in event.payload && typeof event.payload.raw === 'string') {
        return event.payload.raw;
    }
    return event.payload;
};
const toDebugSocketPacketRecord = (event)=>{
    const direction = event.direction === 'incoming' ? (/* inlined export .DebugSocketPacketDirection.Incoming */"incoming") : event.direction === 'outgoing' ? (/* inlined export .DebugSocketPacketDirection.Outgoing */"outgoing") : undefined;
    if (!direction) {
        return undefined;
    }
    const payload = cloneJsonValue(getPacketPayload(event));
    if (payload === undefined) {
        return undefined;
    }
    return Object.freeze({
        direction,
        type: event.type,
        timestamp: event.timestamp,
        payload
    });
};
