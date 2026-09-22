/**
 * 压缩超时之后的确定性兜底。
 *
 * 线上故障（2026-08-27，某会话被彻底锁死）
 * ----------------------------------------
 * 上下文涨到 25.7 万 token、越过压缩阈值 23.9 万之后，连续四轮都是同一个形态：
 *
 *   轮次        totalTokens   messagesBefore   leafId      结果
 *   07:28:22      256,895          261         9bc66aa8   timeout 300,008ms
 *   07:39:21      257,019          261         9bc66aa8   timeout 300,013ms
 *   07:56:17      256,961          261         9bc66aa8   timeout 300,010ms
 *   08:01:52      256,940          261         9bc66aa8   （同样进入压缩）
 *
 * `messagesBefore` 和 `leafId` 四轮**一模一样**——压缩一次都没成功过。而
 * `PiPhaseTimeoutError` 会被直接 rethrow、整轮抛掉，于是上下文永远降不到阈值以下，
 * 下一轮进来又是同样的 5 分钟。用户 33 分钟里发的四条消息全部蒸发，屏幕上没有任何字。
 *
 * 修法
 * ----
 * **压缩是优化，不该是可用性的必要条件。** 一个会话只要证明过自己压不动，就别再拿五分钟
 * 去撞同一堵墙：改走确定性硬裁——只保留最近若干轮，把上下文压到阈值以下继续跑。宁可丢一段
 * 旧上下文，也不能让会话彻底不能用。
 *
 * 状态放在内存里（而不是落盘）是有意的：压缩超时往往是上游一时不可用，重启客户端后值得
 * 再试一次。真正的持久修复是让压缩本身别挂。
 */
/** 记下超时时刻，用于过期。 */
const timedOutSessions = new Map();
/**
 * 标记多久之后可以再试一次压缩。
 * 取 30 分钟：足够跨过一次上游抖动，又不会让一个会话整天都跑在硬裁模式下。
 */
export const COMPACTION_RETRY_COOLDOWN_MS = 30 * 60 * 1000;
/**
 * 硬裁模式下保留的用户轮数。够看懂当前任务，又能把上下文压下去。
 *
 * ⚠️ **已知代价：硬裁期间 prompt 缓存基本不命中。** 保留"最近 N 轮"是个滑动窗口，
 * 每追加一轮，窗口前沿就往后挪一条，请求前缀随之改变——而线上缓存命中率常年 97.9%，
 * 未命中就是全价输入。也就是说一个撞上这条路径的大会话，在冷却期内每一轮都要全价重算。
 *
 * 这是**明知代价后选的**：另一边是会话彻底不能用（每发一条消息黑屏五分钟）。
 * 真正的解法是让压缩本身别挂，而不是把这个窗口做得更聪明。
 * 冷却期一到就会重新尝试压缩，压缩成功即回到正常路径。
 */
export const COMPACTION_FALLBACK_TURN_LIMIT = 6;
export function markCompactionTimedOut(sessionId, now = Date.now()) {
    if (!sessionId)
        return;
    timedOutSessions.set(sessionId, now);
}
/** 压缩成功（或上下文已回落）时清除标记，恢复正常压缩路径。 */
export function clearCompactionTimeout(sessionId) {
    if (!sessionId)
        return;
    timedOutSessions.delete(sessionId);
}
/**
 * 这个会话现在是否该跳过压缩、直接走硬裁？
 *
 * 冷却期过了就自动清除并返回 false —— 压缩不可用往往是上游一时的事，不该永久放弃。
 */
export function shouldSkipCompaction(sessionId, now = Date.now()) {
    if (!sessionId)
        return false;
    const at = timedOutSessions.get(sessionId);
    if (at === undefined)
        return false;
    if (now - at >= COMPACTION_RETRY_COOLDOWN_MS) {
        timedOutSessions.delete(sessionId);
        return false;
    }
    return true;
}
/** 测试用：清空全部状态。 */
export function resetCompactionFallbackState() {
    timedOutSessions.clear();
}
/**
 * 硬裁要收到多少轮。
 *
 * 逐步收紧而不是一步到位：先按常规上限试，装不下再折半，直到落进预算或触到下限 1 轮。
 * 至少留 1 轮——那是用户**这一次**说的话，丢了等于没回答他。
 */
export function resolveFallbackTurnLimit(estimateTokens, budgetTokens, startLimit = COMPACTION_FALLBACK_TURN_LIMIT) {
    let limit = Math.max(1, Math.floor(startLimit));
    while (limit > 1 && estimateTokens(limit) > budgetTokens) {
        limit = Math.max(1, Math.floor(limit / 2));
    }
    return limit;
}
