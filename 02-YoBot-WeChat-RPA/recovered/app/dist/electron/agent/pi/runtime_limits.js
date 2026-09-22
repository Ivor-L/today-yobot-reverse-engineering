export const DEFAULT_PREFLIGHT_COMPACTION_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_AUTOMATIC_COMPACTION_OVERDUE_MS = 5 * 60 * 1000;
/**
 * 单条模型响应流的**空闲**上限：流已建立、却连续这么久没有任何事件。
 *
 * 取 2 分钟的依据：
 *  - 正常首 token 在秒级；最病态的大上下文预处理实测也在 1 分钟内，2 倍余量；
 *  - 摘要（压缩）请求同样走这条流，它的首 token 更慢，所以不能取得更短；
 *  - 再长就失去意义了：用户面对的是一个没有任何反馈的聊天框，
 *    超时后 pi 会自动重试（见 isRetryableAssistantError 对 "timed out" 的判定），
 *    重试是**换一条新连接**，通常立刻成功——所以这里等的时间几乎全是纯浪费。
 *
 * 注意这是**传输层**的空闲判定，不是"agent 没进展"的判定。二者的区别见
 * compaction_hang.smoke.ts 里 stall guard 那一组断言。
 */
export const DEFAULT_LLM_STREAM_IDLE_MS = 2 * 60 * 1000;
function positiveMs(value, fallback) {
    if (!value)
        return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
export function resolvePiRuntimeLimits(env = process.env) {
    return {
        preflightCompactionTimeoutMs: positiveMs(env.YOKO_PREFLIGHT_COMPACTION_TIMEOUT_MS, DEFAULT_PREFLIGHT_COMPACTION_TIMEOUT_MS),
        automaticCompactionOverdueMs: positiveMs(env.YOKO_AUTOMATIC_COMPACTION_OVERDUE_MS, DEFAULT_AUTOMATIC_COMPACTION_OVERDUE_MS),
        llmStreamIdleMs: positiveMs(env.YOKO_LLM_STREAM_IDLE_MS, DEFAULT_LLM_STREAM_IDLE_MS),
    };
}
