import { resolveProfile } from "../profile/resolver.js";
/**
 * 历史里的思考链要不要**回灌**给模型。
 *
 * ## 现状
 *
 * pi-ai 的流解析对任何 OpenAI 兼容端点都**无条件**捕获 `reasoning_content` /
 * `reasoning` / `reasoning_text`，并把 `thinkingSignature` 设成**字段名本身**
 * （openai-completions.js 的 reasoningFields 分支，不看 `model.reasoning`）。
 * 随后 `convertMessages` 又按签名原样回传：`assistantMsg[signature] = 全部 thinking`。
 *
 * 我们这边的保留规则原本只判「有签名就留」，于是一个判据同时承担了三件不同的事：
 *
 * | 场景 | 签名的含义 | 该不该回传 |
 * |---|---|---|
 * | Anthropic | **协议状态**（含 redacted 不透明载荷），签名校验要用 | 必须留 |
 * | Kimi | 该族模型要求历史 assistant 消息带 `reasoning_content` | 必须留 |
 * | DeepSeek 这类 | 只是「这段文字从哪个字段来的」来源标签 | 不必留 |
 *
 * 计费后果是同一批 token 收两遍：先按输出价出一次，之后作为输入在后续每一轮重收
 * （首次回灌未命中价，其余命中价）。线上实测 `Δctx = 上一轮 output + 33`，
 * 64/64 条 trace 精确成立；折算下来定时任务成本的 16.0% 花在纯回灌上。
 *
 * ## 为什么是白名单而不是黑名单
 *
 * 黑名单（「除 Anthropic/Kimi 外都裁」）会踩到线上真实存在的坑：`kimi-k2.6` 正在跑，
 * 而 adapter 里的 `isKimiK25` 只匹配 `kimi-k2.5`/`kimi-k2-5`，k2.6 根本没进兼容分支。
 * 黑名单会把它的思考链一起裁掉，而我们自己的注释写明这一族**要求**回传——
 * 那会是一次静默的能力退化，量小到不容易被发现。
 *
 * 白名单则双向 fail-safe：模型 ID 认不出 → 保持现状（不省钱但绝不出错）；
 * 非 DeepSeek 不可能被误判成 DeepSeek。收益也几乎没损失——DeepSeek 占全平台
 * 85.8% 的积分，定时任务侧 96.6%。
 */
/**
 * 允许裁剪回灌思考链的模型。**白名单，宁可漏不可错。**
 *
 * 加新模型前先确认该 provider 不要求历史带回 reasoning——判据是它自己的接口约定，
 * 不是「跑起来没报错」：回传多余字段通常不报错，只是白白计费。
 */
const PRUNABLE_MODEL_PATTERNS = [/deepseek/i];
/**
 * pi-ai 流解析用过的「回显型」签名值。签名等于字段名本身，见 openai-completions.js
 * 的 `reasoningFields`。裁剪只认这几个值——真正的协议签名（Anthropic 的
 * 签名串、redacted 载荷的 opaque 标记）不在此列，任何模式下都会被保留。
 */
export const REPLAY_ECHO_SIGNATURES = new Set([
    "reasoning_content",
    "reasoning",
    "reasoning_text",
]);
export function isReasoningReplayPrunableModel(modelId) {
    const id = String(modelId || "").trim();
    if (!id)
        return false;
    return PRUNABLE_MODEL_PATTERNS.some((pattern) => pattern.test(id));
}
/**
 * 兜底开关。客户端是打包发版的，出问题不能等重新打包——置 off 即恢复全量回灌。
 * 默认 on：真正的收敛靠模型白名单 + profile 门控两道，不靠这个开关。
 */
export function resolveReasoningPruneMode(value = process.env.YOKO_PRUNE_REPLAYED_REASONING) {
    const normalized = String(value ?? "on").trim().toLowerCase();
    return ["off", "false", "0"].includes(normalized) ? "off" : "on";
}
/**
 * 三道门全通过才裁：兜底开关 → 模型白名单 → profile 声明。
 *
 * profile 那道门是**放量节奏**，不是正确性：收益的三分之二在定时任务，而且只有它有
 * 机器可读的质量信号（checks / outcome / 轮数 / 单次积分，每次运行都随 trace 上报）。
 * 交互会话的劣化只能靠人反馈，慢且噪声大。等 A/B 站住了，把
 * `pruneReplayedReasoning` 加到 mainProfile 上就是放开全量。
 */
export function shouldPruneReplayedReasoning(input) {
    if (resolveReasoningPruneMode(input.env ?? process.env.YOKO_PRUNE_REPLAYED_REASONING) === "off") {
        return false;
    }
    if (!isReasoningReplayPrunableModel(input.modelId))
        return false;
    try {
        return resolveProfile(input.sessionId).pruneReplayedReasoning === true;
    }
    catch {
        // profile 解析失败一律退化为"保留"——省钱永远不值得拿一次请求的正确性去换。
        return false;
    }
}
