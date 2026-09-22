/**
 * 上下文窗口的**两个口径**——它们此前被同一个写死的数字兼任，是本次卡死事故的根。
 *
 *   · 物理窗口 (physical)：模型/网关**真正**能收下多少 token。
 *     只用来判断"这次请求是不是真的溢出了"。
 *     **来源是服务端 `/v1/models` 的 `context_window`，本文件不带任何模型表。**
 *
 *   · 质量预算 (quality budget)：我们**愿意**喂给模型多少 token。
 *     决定什么时候主动压缩。写大了模型开始幻觉、账单也跟着涨。
 *
 * 事故复盘
 * --------
 * 客户端把 contextWindow 写死 128000，服务端却给 deepseek-v4-flash 声明 1000000。
 * 于是上下文涨到 18 万 token 时：请求**成功**返回(stopReason="stop")，
 * 但 pi 的 `isContextOverflow` Case 2 拿 128000 一比 → 判定静默溢出 → 触发
 * "压缩后自动重试"。而那条 assistant 消息是成功的、不是错误的，pi 的重试前清理
 * 只摘 `stopReason === "error"` 的消息，于是它留在上下文末尾，
 * `agent.continue()` 抛 "Cannot continue from message role: assistant"，
 * 又被 `.catch(() => {})` 吞掉 —— 一个事件都不再发出，agent 永远"思考中"。
 *
 * 修法
 * ----
 * 1. 物理窗口交给服务端（`LLMManager.getModelContextWindow`），客户端不再写死，
 *    改模型窗口不用发版；溢出判断因此拿到真值，不再误报。
 * 2. 喂多少由这里的质量预算决定，与物理窗口**解耦**——所以服务端把窗口填成
 *    官方真值（Claude 1M、GPT-5.6 1.05M）也不会让上下文失控或账单爆炸。
 *
 * 主动压缩由 `kernel.ts` 的 `checkContextWindow` 在每轮开始前执行，
 * 不依赖 pi 的 `shouldCompact` —— 这也是为什么把 contextWindow 报成真值是安全的。
 */
/**
 * 质量预算的**默认**封顶值——只在服务端没下发 `recommended_context_window` 时生效。
 *
 * ⚠️ 这个值**不跟着模型的物理窗口涨**。它是产品判断，不是能力上限：
 * 用户侧实测反馈，上下文过大后智能体的指令遵循和事实一致性明显下滑；
 * 128K 是当前在"记得住"和"不跑偏 + 不烧钱"之间的取舍点。
 *
 * 成本视角同样重要：一个用户切到 opus 后几分钟烧掉近 2 万积分，
 * 就是上下文无节制增长的直接代价。封顶是唯一的刹车。
 *
 * 要**放宽**压缩阈值（比如某个模型放到 200K），不要改这里——
 * 在服务端 `llm_providers.ts` 给那个模型填 `recommendedContextWindow`，
 * 逐模型可调、即时生效、不用发客户端版本。这里只是兜底默认值。
 */
export const CONTEXT_QUALITY_BUDGET = 128_000;
/**
 * 物理窗口取不到时的保守默认值（未登录 / 本地直连 / `/v1/models` 拿不到）。
 *
 * 用质量预算本身作默认：等价于拆分之前的行为，且**永远不会把窗口报得比实际大**。
 * 报小的代价（多压一次）远小于报大的代价（真溢出时毫无察觉）。
 */
export const FALLBACK_CONTEXT_WINDOW = CONTEXT_QUALITY_BUDGET;
const isPositive = (n) => !!n && Number.isFinite(n) && n > 0;
/**
 * 算出这个模型的质量预算——**何时主动压缩**由它决定。
 *
 * @param physicalWindow  服务端 `/v1/models` 的 `context_window`（模型能收多少）
 * @param recommended     服务端 `/v1/models` 的 `recommended_context_window`
 *                        （我们愿意喂多少；不下发则走默认策略）
 *
 * 三条规则，都不能少：
 *
 * 1. **服务端给了推荐值就听它的。** 这是把"压缩阈值"变成可远程调节的旋钮：
 *    模型长上下文能力变强后，服务端把它调到 200000 就能放宽，不用发客户端版本。
 *    128K 只是当下的保守默认，不该被焊死在客户端。
 *
 * 2. **永远不超过物理窗口。** 推荐值填过头（比如给 128K 的模型填 200K）时，
 *    压缩会永不触发、直接撞上游报错。物理窗口是硬上限，任何情况下都封顶。
 *
 * 3. **没有推荐值时回落到 `min(物理窗口, 128K)`。** 大窗口模型被封顶，
 *    不会一路涨到幻觉区、账单也不会失控；小窗口模型（8K embedding、32K 小模型）
 *    取自身窗口，不会被强行按 128K 对待。
 */
export function qualityBudgetFor(physicalWindow, recommended) {
    const physical = isPositive(physicalWindow) ? physicalWindow : undefined;
    if (isPositive(recommended)) {
        // 规则 1 + 2：听服务端的，但绝不超过模型能收的量。
        return physical ? Math.min(recommended, physical) : recommended;
    }
    // 规则 3：默认策略。
    if (!physical)
        return CONTEXT_QUALITY_BUDGET;
    return Math.min(physical, CONTEXT_QUALITY_BUDGET);
}
/**
 * Whether Pi can safely summarize the current persisted history with a target
 * model. The reserve is intentionally left to Pi's settings: it covers the
 * summarization response and request-wrapper overhead inside the physical
 * context window.
 */
export function canCompactHistoryWithinWindow(historyTokens, physicalWindow, reserveTokens) {
    const physical = isPositive(physicalWindow) ? physicalWindow : FALLBACK_CONTEXT_WINDOW;
    const reserve = isPositive(reserveTokens) ? reserveTokens : 16384;
    return historyTokens <= Math.max(0, physical - reserve);
}
