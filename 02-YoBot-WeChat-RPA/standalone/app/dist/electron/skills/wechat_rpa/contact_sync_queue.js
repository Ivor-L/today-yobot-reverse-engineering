/**
 * 通讯录同步的串行队列。
 *
 * RPA 侧 `WeRobotCore/api/contact_sync_runner.py` 的 `_CONTACT_SYNC_STATE` 是一个
 * **模块级全局**，不分账号——因为同步走的是同一个 UIA worker（"Contact syncs use the
 * same single UIA worker as chat polling and sending"）。也就是说多号并发同步在
 * RPA 那边**物理上不可能**，第二个请求必然拿到 `409 已有通讯录同步正在执行`。
 *
 * 而 auto_config_sop 恰恰要求「对每个未同步的账号同步群聊」，模型很自然地并行发三个。
 * 线上实录：三个账号并行 → 两个 409 → 模型只好 `shell_exec("ping -n 130 127.0.0.1")`
 * 当 sleep 用，白等 2 分钟再逐个重来，整个一键配置多花 3 分钟。
 *
 * 并发约束属于**接口事实**，不该留给提示词去遵守。这里在工具层排队 + 对 409 退避重试，
 * 对模型呈现为"想同步几个号就调几次，随便并行"。
 */
/** 判定一个错误是不是 RPA 的"同步正在进行"。文案与状态码任一命中即可。 */
export function isContactSyncBusyError(error) {
    const text = error instanceof Error ? error.message : String(error ?? '');
    if (!text)
        return false;
    return /\b409\b/.test(text) || text.includes('已有通讯录同步正在执行');
}
/** 第 n 次重试前等多久。同步本身约 2 分钟，所以退避要按十秒级走，别按毫秒。 */
export function contactSyncRetryDelayMs(attempt) {
    const ladder = [5_000, 15_000, 30_000, 30_000, 30_000];
    return ladder[Math.min(Math.max(0, attempt), ladder.length - 1)];
}
function abortReason(signal) {
    if (!signal?.aborted)
        return undefined;
    return signal.reason instanceof Error
        ? signal.reason
        : new Error(String(signal.reason || 'contact sync aborted'));
}
/** 让调用方能立刻停止等待，但不擅自取消底层 RPA UIA 操作。 */
function waitAbortably(promise, signal) {
    const aborted = abortReason(signal);
    if (aborted)
        return Promise.reject(aborted);
    if (!signal)
        return promise;
    return new Promise((resolve, reject) => {
        const onAbort = () => {
            cleanup();
            reject(abortReason(signal) || new Error('contact sync aborted'));
        };
        const cleanup = () => signal.removeEventListener('abort', onAbort);
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
    });
}
const defaultSleep = (ms, signal) => new Promise((resolve, reject) => {
    const aborted = abortReason(signal);
    if (aborted) {
        reject(aborted);
        return;
    }
    const onAbort = () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(abortReason(signal) || new Error('contact sync aborted'));
    };
    const timer = setTimeout(() => {
        signal?.removeEventListener('abort', onAbort);
        resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
});
/**
 * 一次只放行一个同步任务的串行器。
 *
 * 队列本身不吞错：某个任务失败只影响它自己，后面的照常执行——否则一个账号没登录
 * 就会把其余账号的同步全部带走。
 */
export class ContactSyncQueue {
    tail = Promise.resolve();
    /** 当前排队中（含正在跑的那个）的任务数，用于可观测性与测试。 */
    depth = 0;
    get queueDepth() {
        return this.depth;
    }
    async run(task, options = {}) {
        const maxRetries = Math.max(0, options.maxRetries ?? 5);
        const sleep = options.sleep ?? defaultSleep;
        const delayFor = options.delayForAttempt ?? contactSyncRetryDelayMs;
        this.depth += 1;
        const run = this.tail.then(async () => {
            let lastError;
            for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
                const aborted = abortReason(options.signal);
                if (aborted)
                    throw aborted;
                try {
                    return await task();
                }
                catch (error) {
                    // 只对"正在忙"重试。账号没登录、微信没起来这类错误重试多少次都一样，
                    // 立刻抛出去让用户看到真正的原因。
                    if (!isContactSyncBusyError(error))
                        throw error;
                    lastError = error;
                    if (attempt === maxRetries)
                        break;
                    await sleep(delayFor(attempt), options.signal);
                    const abortedAfterSleep = abortReason(options.signal);
                    if (abortedAfterSleep)
                        throw abortedAfterSleep;
                }
            }
            throw lastError instanceof Error
                ? lastError
                : new Error(String(lastError ?? '通讯录同步一直处于忙碌状态'));
        });
        // depth 和 tail 跟随底层操作，而不是跟随调用方的等待。活动中的 RPA UIA 同步不可硬取消；
        // 用户停止后调用方会立即返回，但必须继续占住队头，直到 RPA 真正释放全局同步锁。
        const tracked = run.finally(() => {
            this.depth -= 1;
        });
        // tail 只负责排队，不能因为前一个任务失败就断链。
        this.tail = tracked.then(() => undefined, () => undefined);
        return waitAbortably(tracked, options.signal);
    }
}
