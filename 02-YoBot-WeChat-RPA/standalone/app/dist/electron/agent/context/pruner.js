import { extractText } from "../../utils/content.js";
import fs from "node:fs";
import path from "node:path";
const DEFAULT_CONFIG = {
    maxToolOutputChars: 2000,
    maxBrowserOutputChars: 20000,
};
export class ContextPruner {
    config;
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }
    /**
     * Prunes the messages to fit within context limits.
     * Specifically targets large tool outputs.
     */
    async prune(messages, client) {
        const results = [];
        for (const msg of messages) {
            if (msg.role !== 'tool' && msg.role !== 'system') {
                results.push(msg);
                continue;
            }
            const textContent = extractText(msg.content);
            const pruneLimit = this.resolveLimit(msg, textContent);
            if (!textContent || textContent.length <= pruneLimit) {
                results.push(msg);
                continue;
            }
            // Skip if it's the Main System Prompt (usually the first system message)
            if (textContent.includes("You are YokoBot") || textContent.includes("You are a")) {
                results.push(msg);
                continue;
            }
            const prunedMsg = await this.pruneContent(msg, pruneLimit, client);
            results.push(prunedMsg);
        }
        return results;
    }
    static async pruneText(text, limit = 2000, client) {
        if (!text || text.length <= limit) {
            return text;
        }
        const cacheId = `cache_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const cacheDir = path.resolve(process.env.USER_DATA_PATH || process.cwd(), "data", "context_cache");
        try {
            await fs.promises.mkdir(cacheDir, { recursive: true });
            await fs.promises.writeFile(path.join(cacheDir, `${cacheId}.txt`), text, 'utf-8');
        }
        catch (err) {
            console.error("[ContextPruner] Failed to save cache file:", err);
        }
        if (client) {
            try {
                console.log(`[ContextPruner] Generating LLM summary for large text (${text.length} chars)...`);
                const prompt = `你是一个专业的上下文压缩引擎。以下是一段非常长的工具/网页输出文本（长度：${text.length} 字符）。
请你生成一份结构化的核心摘要（500字左右），保留关键数据、状态码、结论和核心事实。

待压缩文本（前30000字）：
${text.substring(0, 30000)} ${text.length > 30000 ? "...(已截断)" : ""}
`;
                const response = await client.chat.completions.create({
                    model: 'doubao-seed-1-6-flash-250828',
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 800,
                    temperature: 0.3
                });
                const summary = response.choices[0]?.message?.content || "摘要生成失败。";
                return `[系统提示：长文本已拦截并缓存]\n缓存ID: ${cacheId}\n\n[内容摘要 (由 doubao-1.6-flash 生成)]:\n${summary}\n\n[操作建议]：如果当前摘要不足以完成你的任务，请使用 read_cached_detail 工具并传入 id: ${cacheId} 获取完整细节。`;
            }
            catch (e) {
                console.error("[ContextPruner] LLM Summarization failed, falling back to mechanical:", e);
            }
        }
        // Mechanical fallback
        const headSize = Math.floor(limit * 0.4);
        const tailSize = Math.floor(limit * 0.4);
        const removedChars = text.length - (headSize + tailSize);
        const head = text.substring(0, headSize);
        const tail = text.substring(text.length - tailSize);
        return `${head}\n\n... [Output Truncated: Removed ${removedChars} characters. Cache ID: ${cacheId}] ...\n\n${tail}`;
    }
    resolveLimit(msg, textContent) {
        const toolName = (msg.toolName || msg.name || "").toString();
        if (toolName === "browser_action") {
            return this.config.maxBrowserOutputChars;
        }
        if (textContent.includes("## Browser Snapshot")) {
            return this.config.maxBrowserOutputChars;
        }
        return this.config.maxToolOutputChars;
    }
    async pruneContent(msg, limit, client) {
        if (typeof msg.content === 'string') {
            return {
                ...msg,
                content: await ContextPruner.pruneText(msg.content, limit, client)
            };
        }
        else if (Array.isArray(msg.content)) {
            const newContent = await Promise.all(msg.content.map(async (part) => {
                if (part.type === 'text' && part.text) {
                    return {
                        ...part,
                        text: await ContextPruner.pruneText(part.text, limit, client)
                    };
                }
                return part;
            }));
            return {
                ...msg,
                content: newContent
            };
        }
        return msg;
    }
}
