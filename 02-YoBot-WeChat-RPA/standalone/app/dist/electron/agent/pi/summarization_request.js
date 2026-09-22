/**
 * pi 的摘要系统提示词开头（`packages/coding-agent/src/core/compaction/utils.ts`
 * 的 `SUMMARIZATION_SYSTEM_PROMPT`）。用前缀而不是全文匹配，减少跟随上游
 * 微调而失配的概率。
 */
const SUMMARIZATION_PROMPT_MARKER = "You are a context summarization assistant";
/**
 * 判定是否为摘要/分支总结请求。
 *
 * 判据一（主）：系统提示词命中 pi 的摘要提示词特征。
 * 判据二（辅）：摘要请求从不带工具定义，而 YokoAgent 的对话轮永远带工具。
 *
 * 两条都不满足才当作普通对话轮。之所以取"或"而不是"与"：漏判的代价
 * （摘要被聊天消毒裁坏、压缩静默失效）远大于误判的代价（一轮对话少做几步
 * 可选的历史裁剪）。
 */
export function isSummarizationRequest(context) {
    const systemPrompt = typeof context?.systemPrompt === "string" ? context.systemPrompt : "";
    if (systemPrompt.startsWith(SUMMARIZATION_PROMPT_MARKER))
        return true;
    // 上游改了提示词措辞时的兜底：没有系统提示词、且没有任何工具定义的请求
    // 不可能是 YokoAgent 的对话轮（对话轮的系统提示词由 buildYokoSystemPrompt
    // 产出，工具由 convertTools 注入，两者都不会为空）。
    const hasTools = Array.isArray(context?.tools) && context.tools.length > 0;
    if (!hasTools && !systemPrompt)
        return true;
    return false;
}
/**
 * 去掉空文本块。
 *
 * `AgentSession.prompt(text, { images })` 无条件产出
 * `[{type:"text", text}, ...images]`，纯图片输入时 `text` 为空字符串。
 * Anthropic 会拒绝空的 text content block，所以送出前必须清掉。
 * 这一步对摘要请求同样安全，两条路径都跑。
 */
export function stripEmptyTextParts(messages) {
    if (!Array.isArray(messages))
        return messages;
    let changed = false;
    const out = messages.map((msg) => {
        const content = msg?.content;
        if (!Array.isArray(content))
            return msg;
        const kept = content.filter((part) => !(part?.type === "text" && (typeof part.text !== "string" || part.text.trim() === "")));
        if (kept.length === content.length)
            return msg;
        // 整条消息的内容都被清空时保持原样：宁可送一个空块，也不要产出
        // 一条 content 为空数组的消息（那会触发另一类 provider 报错）。
        if (kept.length === 0)
            return msg;
        changed = true;
        return { ...msg, content: kept };
    });
    return changed ? out : messages;
}
