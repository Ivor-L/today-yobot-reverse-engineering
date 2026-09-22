/**
 * 解析 Seed（豆包 doubao-seed 系列）的 XML 形态工具调用。
 *
 * 背景（线上真实 trace，2026-08-17）：
 *   用户问「为什么识别不了图」，doubao-seed-2-0-lite 想调 wechat_rpa_read_manual，
 *   但它没走结构化 tool_calls，而是把调用**当成正文写进了 reasoning_content**：
 *
 *     <seed:tool_call><function name="wechat_rpa_read_manual">
 *       <parameter name="topic" string="true">index</parameter>
 *     </function></seed:tool_call>
 *
 *   那条 assistant 消息 content 里**只有一个 thinking 块、没有任何 text 块**，
 *   stopReason 还是 "stop"。全仓当时没有任何一处认识这个格式，整段被丢弃：
 *   工具没执行，正文为空，用户拿到的是「任务已完成，但LLM未生成文本回答」——
 *   一句既没做事又宣称完成的话。
 *
 * 两个刻意的设计：
 *   1. **只认显式标记**。不做「看起来像 JSON 就当工具调用」的猜测——
 *      这段文本来自思考链，模型在里面盘算 "我可以调 xxx" 是常态，
 *      宽松匹配会把盘算变成真实副作用。
 *   2. `string="true"` 的参数**不做 JSON 解析**。模型用这个属性明确表态「这是字符串」，
 *      否则 topic="123" 会被解析成数字、"null" 会变成 null。
 */
/** 整段 <seed:tool_call>…</seed:tool_call>，用于解析与剥离。 */
export const SEED_TOOL_CALL_BLOCK = /<seed:tool_call>([\s\S]*?)<\/seed:tool_call>/g;
const FUNCTION_RE = /<function\s+name="([^"]+)"\s*>([\s\S]*?)<\/function>/g;
const PARAM_RE = /<parameter\s+name="([^"]+)"([^>]*)>([\s\S]*?)<\/parameter>/g;
function decodeEntities(s) {
    return s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");
}
function coerce(rawValue, attrs) {
    const value = decodeEntities(rawValue.trim());
    // 模型自己标了 string="true" 就按字符串收，别自作聪明去 JSON.parse
    if (/\bstring\s*=\s*"true"/i.test(attrs))
        return value;
    if (value === "")
        return "";
    if (value === "true")
        return true;
    if (value === "false")
        return false;
    if (value === "null")
        return null;
    if (/^-?\d+(\.\d+)?$/.test(value))
        return Number(value);
    if (/^[[{]/.test(value)) {
        try {
            return JSON.parse(value);
        }
        catch {
            return value;
        }
    }
    return value;
}
/**
 * 抽出所有 Seed 工具调用。没有该标记时返回 null（与既有 parsePseudoToolCalls 约定一致）。
 */
export function parseSeedToolCalls(content) {
    if (!content || !content.includes("<seed:tool_call>"))
        return null;
    const calls = [];
    for (const block of content.matchAll(SEED_TOOL_CALL_BLOCK)) {
        const body = block[1];
        for (const fn of body.matchAll(FUNCTION_RE)) {
            const name = fn[1]?.trim();
            if (!name)
                continue;
            const parameters = {};
            for (const p of fn[2].matchAll(PARAM_RE)) {
                parameters[p[1]] = coerce(p[3], p[2] || "");
            }
            calls.push({ name, parameters });
        }
    }
    return calls.length > 0 ? calls : null;
}
/**
 * 把 Seed 标记从文本里剥掉。
 *
 * 必须做：这段 XML 会随 reasoning_content 一起回灌进后续请求的历史，
 * 既污染上下文（模型会照着这个"先例"继续用文本格式发调用），也可能漏进 UI。
 */
export function stripSeedToolCalls(content) {
    if (!content || !content.includes("<seed:tool_call>"))
        return content;
    return content.replace(SEED_TOOL_CALL_BLOCK, "").replace(/\n{3,}/g, "\n\n").trim();
}
