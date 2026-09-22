// 模型调用失败时给用户看的兜底话术。
//
// 背景（真实用户 trace，2026-07-20）：
//   一个刚注册 1 分钟的新用户问「创建 cron 任务提醒我喝水」，42 秒内问了两遍。
//   两次的 trace 都是：
//       content: []          ← 既没有 thinking 也没有 text
//       stopReason: "error"
//       errorMessage: "Connection error."
//       usage: 全 0          ← 一个 token 都没发出去
//   上游 API 没连上。而 kernel 的空回复兜底当时只处理「有 thinking 无 text」，
//   content 为空数组时不触发，finalResponse 保持空串，
//   UI 收到一条空消息 → 用户【界面上什么都没有】，只能重问。
//
//   新用户的第一次体验就是"点了没反应"，这个杀伤力比答错大得多。
//
// 原则：不要把原始英文错误抛给用户（"Connection error." 对用户没有任何意义），
// 但也不要谎称成功。统一成「说明现象 + 可执行动作」。
/**
 * 全部对外话术的**唯一定义处**。
 *
 * 单独列出来不是为了好看：定时任务需要反过来判断「这段正文是不是我们自己的失败占位符」
 * （见 scheduler/outcome.ts）——占位符被当成任务成果投递到客户群是真实存在的风险。
 * 判定方必须和产出方共用同一份字面量，否则改了一处话术，另一处的识别就会静默失效。
 */
export const MODEL_ERROR_MESSAGES = {
    network: '⚠️ 网络异常，暂时连接不上模型服务。请检查网络后稍后再试。',
    timeout: '⚠️ 模型响应超时，请稍后再试。',
    contentRisk: '⚠️ 当前会话的内容被模型服务判定为风险内容，这个会话无法继续对话了。请新建一个会话再问我一次（重试当前会话不会成功）。',
    rateLimit: '⚠️ 当前请求过于频繁，请稍后再试。',
    upstream5xx: '⚠️ 模型服务暂时不可用，请稍后再试。',
    quota: '⚠️ 账户额度不足，请充值后再试。',
    imageTooLarge: '⚠️ 这个会话里有一张图片超出了模型的大小限制，已自动从上下文中移除，请再发一次消息重试。如果仍然失败，请新建一个会话。',
    badRequest: '⚠️ 当前模型不接受这次请求的格式，换一个模型再试（重试同一个模型不会成功）。',
    unknown: '⚠️ 回答生成失败，请稍后再试。',
};
/**
 * 这段文本是不是「本轮其实什么都没产出」——即正文除了我们自己的失败占位符之外别无他物。
 *
 * 判定刻意收得很紧：只有**整段正文就是占位符**（允许外面裹一层引号/标点）才算。
 * 一篇正常报告里引用了这句话（比如任务在如实汇报"今天的产出都是⚠️回答生成失败"）
 * 不该被判失败——那种输出恰恰是有价值的诊断结论。
 */
export function isModelErrorPlaceholder(text) {
    const t = String(text ?? '').trim();
    if (!t)
        return false;
    return Object.values(MODEL_ERROR_MESSAGES).some(msg => {
        if (t === msg)
            return true;
        if (!t.includes(msg))
            return false;
        // 去掉占位符后只剩空白/引号/括号等装饰 → 仍然是"什么都没产出"
        const rest = t.replace(msg, '').replace(/[\s"'`「」『』【】（）()《》。．.,，、;；:：!！?？~～—\-*#>]/g, '');
        return Array.from(rest).length === 0;
    });
}
/** 归类到具体话术；顺序即优先级。 */
export function friendlyModelError(raw, stopReason) {
    const s = `${raw || ''} ${stopReason || ''}`;
    // 连接层失败：DNS/TCP/TLS 没通，通常是本机网络或上游服务不可达
    if (/Connection error|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|socket hang up|fetch failed|network/i.test(s)) {
        return MODEL_ERROR_MESSAGES.network;
    }
    // 超时：连上了但没等到响应
    if (/timeout|ETIMEDOUT|timed out|aborted due to timeout/i.test(s)) {
        return MODEL_ERROR_MESSAGES.timeout;
    }
    // 内容风控：上游把**会话历史**判定为风险内容而拒绝。
    //
    // 背景（线上真实 trace，2026-08-13）：某会话 04:11 首次命中后，之后 6 轮、跨 4.5 小时
    // 全部在同一处硬失败，usage 全 0（请求根本没进模型），直到用户发出
    // 「给你发送的 指令你收到了吗」然后弃用该会话。
    //
    // 关键：被判风险的是**历史**而不是这一次请求，所以只要还在同一会话里，
    // 重试多少次都不可能成功。这里绝不能落到兜底的「请稍后再试」——
    // 那句话会把用户按在一个永远好不了的会话里反复重试（线上就是这么发生的）。
    // 唯一有效的动作是换一个会话，话术必须直接给出这个动作。
    if (/content exists risk|content_filter|content.?policy|risk.?control|内容风险|违规内容/i.test(s)) {
        return MODEL_ERROR_MESSAGES.contentRisk;
    }
    // 限流
    if (/\b429\b|rate.?limit|too many requests|请求过于频繁/i.test(s)) {
        return MODEL_ERROR_MESSAGES.rateLimit;
    }
    // 上游 5xx：服务方的问题，用户重试有意义
    if (/\b5\d{2}\b|server error|service unavailable|bad gateway|overloaded/i.test(s)) {
        return MODEL_ERROR_MESSAGES.upstream5xx;
    }
    // 余额/配额：需要用户去处理，不是重试能解决的
    if (/insufficient|quota|balance|余额不足|积分不足/i.test(s)) {
        return MODEL_ERROR_MESSAGES.quota;
    }
    // 图片超限：必须排在通用 400 之前。
    //
    // 线上实录（2026-08-20）：用户 08-18 传了张 22MiB 的图，两天后问一个与图片
    // 毫无关系的问题照样 400 —— 图还在历史里，每轮都重发。当时落到了下面的 badRequest，
    // 给出的是"换一个模型再试"，而**换模型没有任何用**：历史跟着会话走，
    // 换到哪个模型都会带着这张图再撞一次限额。
    // 现在 pruneOversizedImages 会在下一次请求前把它摘掉，所以这里要引导"再发一次"。
    if (/input image|image.{0,20}exceeds|exceeds.{0,20}limit.{0,20}image|image.{0,20}too large|图片.{0,10}(过大|超出)/i.test(s)) {
        return MODEL_ERROR_MESSAGES.imageTooLarge;
    }
    // 400 类：请求本身不合法（工具 schema 不被该模型接受、图片格式不对等）。
    // 这类错误换多少次都是同样的结果，跟"稍后"没有关系——同一个模型必然再失败一次。
    // 线上实录：用户就同一个问题连问 3 遍、期间换了 3 个模型，撞的是两个不同的 400，
    // 一次答案都没拿到。所以要把用户引到"换模型"，而不是"等一会儿"。
    if (/\b400\b|invalid[_ ]request|invalid[_ ]type|is not a valid|unsupported_/i.test(s)) {
        return MODEL_ERROR_MESSAGES.badRequest;
    }
    // 兜底：不暴露原始英文报错，但明确告知失败且可重试
    return MODEL_ERROR_MESSAGES.unknown;
}
/**
 * 这条 assistant 消息是不是「彻底空」——既无正文也无思考。
 *
 * 与「有思考但没正文」要分开处理：后者是模型行为异常（DeepSeek Reasoner 常见），
 * 内容其实还在思考块里；前者是调用压根没成功，什么都没有。
 */
export function isEmptyAssistantMessage(content) {
    if (!Array.isArray(content))
        return !content;
    if (content.length === 0)
        return true;
    return !content.some((c) => (c?.type === 'text' && typeof c.text === 'string' && c.text.trim() !== '') ||
        c?.type === 'thinking');
}
