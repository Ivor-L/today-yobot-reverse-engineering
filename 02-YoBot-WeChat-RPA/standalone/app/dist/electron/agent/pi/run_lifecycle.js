/**
 * 一个 Pi run 内部阶段的取消 / 超时边界。
 *
 * 这里不负责“杀死”具体工作——调用方通过 onCancel 调 agent.abort()、
 * session.abortCompaction() 等真正的取消入口。它负责的是：
 *
 * 1. 用户停止后，等待方一定能退出；
 * 2. 阶段超时后，不会留下一个永远 pending 的 await；
 * 3. 发出取消后给底层 Promise 一个很短的收尾窗口，避免刚释放会话锁，
 *    老的异步操作又回来修改同一个 session。
 */
export class PiRunCancelledError extends Error {
    constructor(message = "Pi run cancelled") {
        super(message);
        this.name = "PiRunCancelledError";
    }
}
export class PiPhaseTimeoutError extends Error {
    phase;
    timeoutMs;
    constructor(phase, timeoutMs) {
        super(`${phase} timed out after ${timeoutMs}ms`);
        this.phase = phase;
        this.timeoutMs = timeoutMs;
        this.name = "PiPhaseTimeoutError";
    }
}
export class StreamIdleTimeoutError extends Error {
    idleMs;
    constructor(idleMs) {
        // 文案里的 "timed out" 是**接口的一部分**，两个下游按它做判定：
        //  1. pi 的 isRetryableAssistantError（pi-ai/utils/retry.js 的 "timed? out"）
        //     —— 命中才会触发自动重试，也就是这个超时能自愈的唯一原因；
        //  2. friendlyModelError（model_error.ts）—— 命中才会给用户
        //     「模型响应超时」而不是兜底的「回答生成失败」。
        // 改这句话之前先看这两处。
        super(`模型响应流已 ${idleMs}ms 没有任何数据，判定为连接失效（stream idle timed out）`);
        this.idleMs = idleMs;
        this.name = "StreamIdleTimeoutError";
    }
}
/**
 * 给**一条**模型响应流加空闲超时。
 *
 * 为什么必须在这一层做，而不是"agent 多久没进展就杀一轮"：
 *
 *   后者是被明令禁止的（见 kernel.ts 里自动压缩看门狗的注释、以及
 *   compaction_hang.smoke.ts 的 stall guard 断言）——长工具链、长压缩的沉默
 *   都是合法的，按沉默时间一刀切会误杀正在正常工作的一轮。
 *
 *   这里判定的是另一件事：一条**已经建立**的 HTTP 响应流连续 idleMs 没有产出
 *   任何事件。工具在执行时根本没有流打开，计时器不存在，物理上不可能误判。
 *   这就是整条链路唯一缺失的 read timeout：OpenAI SDK 的 timeout 在收到响应头
 *   那一刻就 clearTimeout 了（openai/client.js 的 fetchWithTimeout），
 *   pi 不传 timeoutMs，本地代理的 axios 也没有 timeout —— 于是上游只要
 *   "连着但不再吐字节"，整轮就永久挂起，只有用户按停止能救。
 *
 * onIdle 用来真正取消底层请求（abort 掉 fetch）。只中断迭代而不 abort，
 * socket 会一直挂着。
 */
export async function* withStreamIdleTimeout(source, options) {
    const { idleMs, onIdle } = options;
    if (!Number.isFinite(idleMs) || idleMs <= 0) {
        yield* source;
        return;
    }
    const iterator = source[Symbol.asyncIterator]();
    let exhausted = false;
    try {
        for (;;) {
            let timer;
            const idle = new Promise((_, reject) => {
                timer = setTimeout(() => reject(new StreamIdleTimeoutError(idleMs)), idleMs);
            });
            // 超时胜出后这个 promise 仍然 pending；它将来若 reject（abort 传到底层
            // 时通常会），没有 handler 就是一条 unhandledRejection。先挂一个空 catch
            // 标记为已处理——race 本身仍然照常拿到它的结果。
            const next = iterator.next();
            next.catch(() => undefined);
            let result;
            try {
                result = await Promise.race([next, idle]);
            }
            catch (error) {
                if (error instanceof StreamIdleTimeoutError) {
                    // 先 abort 底层请求，再把超时抛给调用方：调用方的 catch 会把它
                    // 转成 assistant error 终态，而 abort 保证连接不会继续挂着。
                    try {
                        onIdle?.();
                    }
                    catch { /* 取消入口失败不能掩盖超时本身 */ }
                }
                throw error;
            }
            finally {
                if (timer)
                    clearTimeout(timer);
            }
            if (result.done) {
                exhausted = true;
                return;
            }
            yield result.value;
        }
    }
    finally {
        // 提前退出（超时 / 调用方 break）时给上游一个收尾机会。
        //
        // **绝不能 await 它**：上游此刻正卡在一个永不 resolve 的 await 上（那正是
        // 我们超时的原因），而 async generator 的 return() 要等它恢复才结算——
        // await 一下，清理本身就永久挂起，超时等于白做。回归测试里那条"停摆的流"
        // 第一次就是这么挂住的。真正的清理靠 onIdle 里的 abort，这里只是补一个信号。
        if (!exhausted) {
            try {
                void Promise.resolve(iterator.return?.()).catch(() => undefined);
            }
            catch { /* best effort */ }
        }
    }
}
export function cancellationError(signal) {
    return signal.reason instanceof Error
        ? signal.reason
        : new PiRunCancelledError();
}
export function throwIfRunCancelled(signal) {
    if (signal.aborted)
        throw cancellationError(signal);
}
export function isRunCancelledError(error) {
    if (error instanceof PiRunCancelledError)
        return true;
    const name = error && typeof error === "object" ? String(error.name || "") : "";
    return name === "AbortError" || name === "APIUserAbortError" || name === "PiRunCancelledError";
}
/** Only threshold/overflow compactions belong to AgentSession.prompt()'s automatic lifecycle. */
export function isAutomaticCompactionReason(reason) {
    return reason === "threshold" || reason === "overflow";
}
/**
 * A retry may emit one or more failed assistant messages before AgentSession.prompt() settles.
 * The outer kernel must judge the run by the final assistant message, not by an intermediate error.
 */
export function isSuccessfulSettledAssistant(message) {
    const candidate = message;
    return candidate?.role === "assistant"
        && candidate?.stopReason !== "error"
        && candidate?.stopReason !== "aborted";
}
/**
 * A run ended by a tool's accepted termination request (cron_run_complete) settles on that
 * tool's result, not on an assistant message: pi stops the loop right after the terminating
 * tool batch, so the tail is a toolResult by design.
 *
 * Without this, "first request fails → auto retry succeeds → structured outcome submitted"
 * rethrew the recovered error, and the scheduler discarded an accepted success
 * (2026-09-10~13: 25 group summaries generated but never delivered).
 *
 * Mirrors adapter.ts' terminate rule exactly — same tool name, non-error result — so an
 * errored or unrelated tool tail still cannot hide a captured run error.
 */
export function isSuccessfulToolTermination(message, termination) {
    const candidate = message;
    return Boolean(termination?.toolName)
        && candidate?.role === "toolResult"
        && candidate?.isError !== true
        && candidate?.toolName === termination.toolName;
}
/**
 * 等待一个 Pi 阶段完成，同时响应用户取消和绝对超时。
 *
 * operationResult 自己吞住 rejection，再由本函数显式抛出；即便取消先赢，
 * 底层 Promise 随后才 reject，也不会形成 unhandled rejection。
 */
export async function waitForPiPhase(operation, options) {
    const { phase, signal, timeoutMs, onCancel, onTimeout, onUnsettled, abortDrainMs = 2_000, } = options;
    throwIfRunCancelled(signal);
    const operationResult = operation.then((value) => ({ kind: "operation", ok: true, value }), (error) => ({ kind: "operation", ok: false, error }));
    let abortListener;
    const cancelled = new Promise((resolve) => {
        abortListener = () => resolve({ kind: "cancelled", error: cancellationError(signal) });
        signal.addEventListener("abort", abortListener, { once: true });
    });
    let timeoutHandle;
    const racers = [
        operationResult,
        cancelled,
    ];
    if (typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0) {
        racers.push(new Promise((resolve) => {
            timeoutHandle = setTimeout(() => {
                resolve({
                    kind: "timeout",
                    error: new PiPhaseTimeoutError(phase, timeoutMs),
                });
            }, timeoutMs);
        }));
    }
    const winner = await Promise.race(racers);
    if (abortListener)
        signal.removeEventListener("abort", abortListener);
    if (timeoutHandle)
        clearTimeout(timeoutHandle);
    if (winner.kind === "operation") {
        if (winner.ok)
            return winner.value;
        // abort 与底层 rejection 同时发生时，Promise 调度顺序不应改变用户看到的语义。
        if (signal.aborted)
            throw cancellationError(signal);
        throw winner.error;
    }
    if (winner.kind === "timeout") {
        try {
            onTimeout?.();
        }
        catch { /* lifecycle callbacks must not mask timeout */ }
    }
    try {
        onCancel();
    }
    catch {
        // 取消入口本身报错不能阻止锁释放；底层是否收尾由 drain 结果决定。
    }
    let drainHandle;
    const drained = await Promise.race([
        operationResult.then(() => true),
        new Promise((resolve) => {
            drainHandle = setTimeout(() => resolve(false), abortDrainMs);
        }),
    ]);
    if (drainHandle)
        clearTimeout(drainHandle);
    if (!drained) {
        try {
            onUnsettled?.();
        }
        catch { /* preserve the original cancellation reason */ }
    }
    throw winner.error;
}
