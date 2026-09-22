// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/engine/utils.ts.
// The original TypeScript and import graph are not restored.


/** 只要有一个 kick 不是「只重发 outbox」（retry），本轮就要完整读一遍。 */ const intentNeedsRead = (intent)=>{
    return [
        ...intent.reasons
    ].some((reason)=>reason !== (/* inlined export .DeviceConnectorSyncKickReason.Retry */"retry"));
};
/** 自有错误记 code，其余只记类型名：EventKit / 系统错误的 message 可能带路径或用户正文。 */ const describeCode = (error)=>{
    if (error !== null && typeof error === 'object') {
        const code = error.code;
        if (typeof code === 'string' && code.length > 0) {
            return code;
        }
        return error.constructor?.name ?? 'Error';
    }
    return typeof error;
};
const utils_sleep = (delayMs, signal)=>{
    return new Promise((resolve)=>{
        if (signal.aborted) {
            resolve();
            return;
        }
        const finish = ()=>{
            clearTimeout(timer);
            signal.removeEventListener('abort', finish);
            resolve();
        };
        const timer = setTimeout(finish, delayMs);
        timer.unref();
        signal.addEventListener('abort', finish, {
            once: true
        });
    });
};
