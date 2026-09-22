/**
 * 上下文 token 的本地保守估算。
 *
 * pi 默认用 chars / 4；这个经验值只适合英文，对中文会低估接近 4 倍，且 user
 * 消息里的图片完全不计。预压缩若沿用它，就会在中文长会话和多图会话里触发得过晚。
 */
/**
 * 按常见视觉模型高细节图片的量级保守估值。pi 自带的 1200 只够较小图片；
 * 用户上传的大图经切片后常在 2K～3K token，取 4000 留出跨供应商余量。
 */
export const ESTIMATED_IMAGE_TOKENS = 4_000;
const CJK = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uf900-\ufaff]/gu;
export function estimateContextStringTokens(text) {
    if (!text)
        return 0;
    const cjk = (text.match(CJK) || []).length;
    const rest = Math.max(0, text.length - cjk);
    return cjk + Math.ceil(rest / 4);
}
function estimateContent(content) {
    if (typeof content === "string")
        return estimateContextStringTokens(content);
    if (!Array.isArray(content))
        return 0;
    let tokens = 0;
    for (const block of content) {
        if (!block || typeof block !== "object")
            continue;
        if (block.type === "text" && typeof block.text === "string") {
            tokens += estimateContextStringTokens(block.text);
        }
        else if (block.type === "thinking" && typeof block.thinking === "string") {
            tokens += estimateContextStringTokens(block.thinking);
        }
        else if (block.type === "toolCall") {
            tokens += estimateContextStringTokens(String(block.name || ""));
            try {
                tokens += estimateContextStringTokens(JSON.stringify(block.arguments ?? {}));
            }
            catch { /* malformed tool arguments are ignored by the estimator */ }
        }
        else if (block.type === "image" || block.type === "image_url") {
            // 绝不能按 data URL/base64 字符数计：那会把一张普通图片误算成几十万 token。
            tokens += ESTIMATED_IMAGE_TOKENS;
        }
    }
    return tokens;
}
export function estimateContextMessageTokens(message) {
    if (!message || typeof message !== "object")
        return 0;
    switch (message.role) {
        case "bashExecution":
            return estimateContextStringTokens(String(message.command || ""))
                + estimateContextStringTokens(String(message.output || ""));
        case "branchSummary":
        case "compactionSummary":
            return estimateContextStringTokens(String(message.summary || ""));
        default:
            return estimateContent(message.content);
    }
}
