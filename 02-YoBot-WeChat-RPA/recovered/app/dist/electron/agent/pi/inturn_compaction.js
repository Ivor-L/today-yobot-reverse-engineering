/**
 * 轮内上下文守卫。
 *
 * 背景：`checkContextWindow` 是**预压缩**，每轮开始前跑一次。它按质量预算
 * （`qualityBudgetFor`，默认 128K/服务端下发）决定要不要压，而 `model.contextWindow`
 * 保持物理真值（DeepSeek 1M、GPT-5.6 1.05M）——后者只服务 pi 的 `isContextOverflow`，
 * 两者刻意解耦（见 compaction_hang.smoke.ts）。
 *
 * 代价是：解耦之后，pi 自己的 `_checkCompaction` 用的阈值变成
 * `physicalWindow - reserveTokens`（1M - 16K ≈ 983K），对一个 300K 的上下文永远不触发。
 * 于是**轮内**没有守门人：一轮里跑上百个工具调用时，上下文可以从 12 万涨到 30 万，
 * 全程不压缩，直到请求体被网关以 413 顶回来、整轮零输出。
 *
 * 线上实测（2026-08-23~08-26，148 条 trace）：
 *   - 每条 trace 的 `Context Window Check` 事件恒为 1 次，确认轮内无二次评估；
 *   - 16 条（10.8%）峰值超过 compactionTrigger 却从未压缩，最高 3.74×；
 *   - 3 条因此拿到 `413 Payload Too Large`，`finalResponseLength: 0`。
 *
 * 修法：不动 `model.contextWindow`（那会重新把两个数字绑死，正是 smoke 守着的反例），
 * 而是把 pi 看到的 `compaction.reserveTokens` 抬高到
 * `physicalLimit - compactionTrigger`，使
 *
 *     shouldCompact = contextTokens > physicalLimit - piReserve
 *                   = contextTokens > compactionTrigger
 *
 * 与预压缩用的是同一个阈值。pi 的 `_checkCompaction` 每条 assistant 消息都会跑，
 * 因此守门人就在轮内恢复了。
 */
/** pi 的 `DEFAULT_COMPACTION_SETTINGS.reserveTokens`。*/
export const DEFAULT_COMPACTION_RESERVE_TOKENS = 16_384;
/** 被抬高之后仍要给摘要请求本身留的余量，避免把 pi 的压缩窗口挤成 0。 */
const MIN_HEADROOM_TOKENS = 8_192;
/**
 * 读**基准** reserveTokens（用户设置或 pi 默认），不受本模块补丁影响。
 *
 * `compactionTrigger` 和 `canCompactHistoryWithinWindow` 都必须用这个值：
 * 用被抬高后的值会让阈值自己吃自己，一轮比一轮低。
 */
export function readBaseReserveTokens(session) {
    const mgr = session?.settingsManager;
    const getter = mgr?.__yokoBaseReserveTokens || mgr?.getCompactionReserveTokens;
    if (typeof getter !== "function")
        return DEFAULT_COMPACTION_RESERVE_TOKENS;
    try {
        const value = Number(getter.call(mgr));
        return Number.isFinite(value) && value > 0 ? value : DEFAULT_COMPACTION_RESERVE_TOKENS;
    }
    catch {
        return DEFAULT_COMPACTION_RESERVE_TOKENS;
    }
}
/**
 * 算出要让 pi 看到的 reserveTokens。纯函数，便于直接对着 pi 的 `shouldCompact` 断言。
 *
 * 返回 `null` = 不需要抬高（阈值已经比 pi 默认的更宽松，或参数不可用），此时保持原样，
 * 绝不下调用户配置的 reserve。
 */
export function piReserveForBudget(physicalLimit, compactionTrigger, baseReserveTokens = DEFAULT_COMPACTION_RESERVE_TOKENS) {
    if (!Number.isFinite(physicalLimit) || physicalLimit <= 0)
        return null;
    if (!Number.isFinite(compactionTrigger) || compactionTrigger <= 0)
        return null;
    // 触发点必须真的落在物理窗口内部，且给摘要请求留出余量，否则抬高没有意义。
    if (compactionTrigger >= physicalLimit - MIN_HEADROOM_TOKENS)
        return null;
    const desired = Math.floor(physicalLimit - compactionTrigger);
    // 只抬高、不下调：用户把 reserve 调大是"更早压缩"的意思，不能被我们回退。
    if (desired <= baseReserveTokens)
        return null;
    return desired;
}
/**
 * 把守卫装到 session 上。幂等：同样的阈值重复调用不会叠加补丁。
 *
 * 失败一律吞掉——上下文守卫是增强项，任何异常都不该让聊天挂掉。
 */
export function applyInTurnCompactionGuard(session, physicalLimit, compactionTrigger) {
    const mgr = session?.settingsManager;
    if (!mgr || typeof mgr.getCompactionReserveTokens !== "function")
        return null;
    const baseReserveTokens = readBaseReserveTokens(session);
    const piReserveTokens = piReserveForBudget(physicalLimit, compactionTrigger, baseReserveTokens);
    if (piReserveTokens === null) {
        return {
            applied: false,
            piReserveTokens: baseReserveTokens,
            effectiveTrigger: physicalLimit - baseReserveTokens,
            baseReserveTokens,
        };
    }
    const existing = mgr.__yokoInTurnGuard;
    if (existing && existing.piReserveTokens === piReserveTokens) {
        return {
            applied: true,
            piReserveTokens,
            effectiveTrigger: physicalLimit - piReserveTokens,
            baseReserveTokens,
        };
    }
    try {
        if (!mgr.__yokoBaseReserveTokens) {
            // 只在第一次打补丁时保存原 getter；模型切换后重新计算会走到这里，
            // 那时 __yokoBaseReserveTokens 已经存在，读到的仍是用户真实设置。
            mgr.__yokoBaseReserveTokens = mgr.getCompactionReserveTokens.bind(mgr);
        }
        mgr.getCompactionReserveTokens = () => piReserveTokens;
        mgr.__yokoInTurnGuard = { physicalLimit, compactionTrigger, piReserveTokens };
    }
    catch {
        return null;
    }
    return {
        applied: true,
        piReserveTokens,
        effectiveTrigger: physicalLimit - piReserveTokens,
        baseReserveTokens,
    };
}
