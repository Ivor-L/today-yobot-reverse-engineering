// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/native-sync/utils.ts.
// The original TypeScript and import graph are not restored.



/**
 * 给一个不可取消的等待加上应用级 deadline。
 *
 * 用于 Native RPC 这类没有 AbortSignal 的调用：请求悬挂时若不设上限，
 * 调用方的 in-flight 标记永远不释放，后续触发全被合并丢弃。
 */ const withDeadline = async (operation, promise, timeoutMs)=>{
    let timer;
    const deadline = new Promise((_resolve, reject)=>{
        timer = setTimeout(()=>{
            reject(interface_error_InterfaceError(base_InterfaceErrorCode.Unavailable, `Timed out while attempting to ${operation}.`));
        }, timeoutMs);
        timer.unref();
    });
    try {
        await Promise.race([
            promise,
            deadline
        ]);
    } finally{
        if (timer) {
            clearTimeout(timer);
        }
    }
};
