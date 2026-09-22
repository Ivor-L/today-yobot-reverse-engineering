/**
 * 单会话的**用户提问数**配额。
 *
 * 为什么用"提问数"而不是别的信号
 * ------------------------------
 * 排查这轮事故时评估过几个候选，都被否掉了：
 *
 *   · **累计积分**：不同模型单位提问的积分消耗差一两个数量级，同一个阈值对不同模型
 *     意味着完全不同的会话长度。更要命的是常驻展示消耗会让用户**不敢提问**——
 *     省下的那点积分远不值这个代价。
 *
 *   · **压缩次数**：会误伤"一上来就传几个文档"的用户——他可能问第 2 个问题就触发了
 *     压缩，却被提示"会话太长了"，体感很差。压缩次数反映的是 token 体量，
 *     不是会话的"信息密度"。
 *
 *   · **模型调用轮数**：一个用户问题 agent 可能跑 50 轮工具才解决。按轮数算，
 *     重度用户的额度会被工具调用吃光，与他实际问了多少问题毫无关系。
 *
 * 最后落到**用户提问数**：它和"这个会话承载了多少件事"最贴近，而且可预测、
 * 可解释（用户自己能数，客服也说得清）。
 *
 * 为什么提醒而不是尽早强制
 * ------------------------
 * 切换会话的收益不是省钱，是**当上下文关联性对回答质量的边际收益开始下降时**换个干净的开始。
 * 在那之前，同一会话里上下文关联更紧密、回答效果更好——即使积分消耗更快，
 * 也不该催用户走。所以 100 的倍数只提醒、不打断，500 才是硬闸。
 */
/** 每达到这个倍数提醒一次。 */
export const QUESTION_REMINDER_INTERVAL = 100;
/** 单会话提问数硬上限。到这个数之后本会话不再接受新提问。 */
export const QUESTION_HARD_LIMIT = 500;
/**
 * @param countIncludingThis 含本次提问在内的会话提问数。
 *
 * 边界口径：上限是 500 **条**，所以第 500 条允许（并给出"这是最后一条"的提醒），
 * 第 501 条才拒绝。
 */
export function evaluateQuestionQuota(countIncludingThis) {
    if (countIncludingThis > QUESTION_HARD_LIMIT) {
        return { action: "block", count: countIncludingThis - 1, limit: QUESTION_HARD_LIMIT };
    }
    if (countIncludingThis > 0 && countIncludingThis % QUESTION_REMINDER_INTERVAL === 0) {
        return {
            action: "allow_with_reminder",
            reminder: {
                count: countIncludingThis,
                remaining: QUESTION_HARD_LIMIT - countIncludingThis,
                limit: QUESTION_HARD_LIMIT,
            },
        };
    }
    return { action: "allow" };
}
/**
 * 待投递的提醒。
 *
 * 提醒在**收下提问时**判定（那时才知道计数），却要在**回答结束后**才插进会话——
 * 夹在用户提问和 agent 回答之间会像是打断了对话。这里替这段时间差存一下。
 *
 * 用 Map 而不是挂在 msg.metadata 上：metadata 会随消息投递给各渠道并落进历史，
 * 一个纯 UI 提示不该污染消息本身。
 */
const pending = new Map();
export function stashReminder(unifiedSessionId, reminder) {
    pending.set(unifiedSessionId, reminder);
}
/** 取出并清除。取不到返回 undefined —— 绝大多数轮次都走这条。 */
export function takeReminder(unifiedSessionId) {
    const value = pending.get(unifiedSessionId);
    if (value)
        pending.delete(unifiedSessionId);
    return value;
}
/** 达到上限时给用户看的话。说清三件事：为什么、怎么办、历史还在不在。 */
export function blockMessage(limit) {
    return [
        `这个会话已经问满 ${limit} 个问题，不再接受新提问。`,
        "",
        "请新建一个会话继续。会话越长，模型要带的历史越多——响应变慢、积分消耗变快，",
        "早期的内容也会在多次压缩后逐渐模糊。换个干净的会话，回答质量反而更好。",
        "",
        "这个会话的全部记录都保留着，随时可以回来查看。",
    ].join("\n");
}
