/**
 * 知识库图片「令牌通道」。
 *
 * 背景：线上知识库(fireflow)里的图片文档(如付款二维码)检索命中后带一个**签名 URL**
 * (OSS 1 小时有效、二三百字符、含 `?Expires=&Signature=`)。若直接把 URL 塞进 prompt 让
 * 模型复述,DeepSeek 这类模型极易漏字符/截断 → 客户收到打不开的死链。
 *
 * 方案:检索阶段给每张图分配一个**短令牌** `[[IMG:1]]`,注入知识时只告诉模型"要发这张图就
 * 输出这个令牌";出口阶段(agentic sanitize)再把令牌**确定性**展开成真实 URL 段。模型只需
 * 复述 8 个字符的令牌,URL 由代码保真——彻底消除 URL 复述失真。
 *
 * 令牌→URL 映射是**每次运行**的,通过 `RequestContext` 这个可变对象在 kernel(写)与 agentic
 * 出口(读)之间传递,不落全局态。
 */
/** RequestContext 上承载令牌映射的字段名。 */
export const IMAGE_TOKENS_CTX_KEY = "imageTokens";
/** 从知识文本推断一个简短图片名,给模型一个自然的指代。失败回落"图片"。 */
export function deriveImageLabel(text) {
    if (!text)
        return "图片";
    // 常见形态:`[文档名称: 个人收款码.jpg]` / `个人收款码.jpg` → 取文件名主体
    const named = text.match(/文档名称[:：]\s*([^\]\n]+?)(?:\.(?:jpe?g|png|gif|webp|bmp))?\s*[\]\n]/i);
    if (named?.[1])
        return named[1].trim().slice(0, 20);
    const file = text.match(/([^\s/\\]+?)\.(?:jpe?g|png|gif|webp|bmp)/i);
    if (file?.[1])
        return file[1].trim().slice(0, 20);
    const firstLine = text.split(/\r?\n/)[0]?.trim();
    return (firstLine || "图片").slice(0, 20);
}
/**
 * 给一批检索结果里带图的 chunk 分配令牌,并把「发图指令」拼到其文本末尾。
 * 返回令牌映射(可能为空)。**只改 chunk.text,不改其它字段**,令牌指令随知识注入正常流转。
 */
export function attachImageTokensToFacts(facts) {
    const tokens = [];
    for (const f of facts) {
        const url = f.imageUrl;
        if (!url || typeof url !== "string" || !/^https?:\/\/|^data:image\//.test(url))
            continue;
        const idx = tokens.length + 1;
        const token = `[[IMG:${idx}]]`;
        const label = deriveImageLabel(f.text);
        tokens.push({ token, url, label });
        f.text =
            `${f.text}\n（本条知识关联一张图片「${label}」。当客户需要这张图片时，` +
                `请在回复中**单独一行**原样输出令牌 ${token}，系统会自动把图片发给客户；` +
                `切勿输出图片网址本身，也不要描述令牌。）`;
    }
    return tokens;
}
/**
 * 从模型原始输出里剥离令牌,并按出现顺序返回要发送的图片 URL(去重)。
 *
 * - 令牌整段(可能独占一行)从文本里移除,绝不泄漏给客户;
 * - 只展开**确实出现过**的令牌 → 模型没提就不发图(尊重模型意图);
 * - URL 作为独立段返回,由调用方拼在净化后的文本段之后,避免被 300 字硬切打断。
 */
export function extractImageTokens(raw, tokens) {
    if (!raw || !tokens?.length)
        return { text: raw ?? "", urls: [] };
    let text = raw;
    const urls = [];
    const seen = new Set();
    for (const t of tokens) {
        // 令牌形如 [[IMG:1]] —— 转义后全局匹配,连带其独占行的换行一并清掉
        const esc = t.token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`[ \\t]*${esc}[ \\t]*\\n?`, "g");
        if (re.test(text)) {
            text = text.replace(re, "");
            if (!seen.has(t.url)) {
                seen.add(t.url);
                urls.push(t.url);
            }
        }
    }
    // 防御:模型偶尔会吐出越界/幻觉令牌(如 [[IMG:5]] 但只映射了 IMG:1)。这类未映射令牌
    // 不发图、也绝不能作为字面量发给客户,统一清掉。
    text = text.replace(/\[\[\s*IMG:\s*\d+\s*\]\]/gi, "");
    return { text: text.trim(), urls };
}
