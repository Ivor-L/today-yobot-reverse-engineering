/**
 * 当前正在执行的工具调用登记表，按 session 维度。
 *
 * 存在的理由：一个 turn 长时间不返回时，队列快照只有用户自己发的那句话
 * （QueueTurnView.preview），完全看不出卡在哪。渠道用户（微信）更严重 —— ilink
 * adapter 没有实现 sendEvent，所以 agent 事件流一条都到不了用户手里。要回答
 * "到底是什么阻塞了"，先得把这个信息采下来。
 *
 * 纯观测：只登记与查询，不做超时判断、不中止任何东西。
 *
 * pi 支持并行工具调用（agent-loop.js:executeToolCallsParallel），所以同一 session
 * 可能同时有多个在跑；这里存全集，读的时候报最早那个（最可疑的那个）。
 */
const activeBySession = new Map();
/** 登记一次工具调用开始，返回用于注销的句柄。 */
export function markToolStart(sessionId, name) {
    const entry = { name, startedAt: Date.now() };
    let entries = activeBySession.get(sessionId);
    if (!entries) {
        entries = new Set();
        activeBySession.set(sessionId, entries);
    }
    entries.add(entry);
    return entry;
}
/** 注销一次工具调用。必须在 finally 里调用，否则登记表会泄漏并谎报卡住。 */
export function markToolEnd(sessionId, entry) {
    const entries = activeBySession.get(sessionId);
    if (!entries)
        return;
    entries.delete(entry);
    if (entries.size === 0)
        activeBySession.delete(sessionId);
}
/** 该 session 当前最早开始、仍未返回的工具调用；没有则 undefined。 */
export function getOldestActiveTool(sessionId) {
    const entries = activeBySession.get(sessionId);
    if (!entries || entries.size === 0)
        return undefined;
    let oldest;
    for (const entry of entries) {
        if (!oldest || entry.startedAt < oldest.startedAt)
            oldest = entry;
    }
    return oldest;
}
/** 该 session 当前在跑的工具数量（并行调用时 > 1）。 */
export function countActiveTools(sessionId) {
    return activeBySession.get(sessionId)?.size ?? 0;
}
