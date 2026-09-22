import { extractReadableContent, truncateText } from "../utils/web_utils.js";
// Basic in-memory cache
const CACHE = new Map();
const MAX_CACHE_SIZE = 100;
function getCache(key) {
    const entry = CACHE.get(key);
    if (!entry)
        return null;
    if (Date.now() > entry.expiresAt) {
        CACHE.delete(key);
        return null;
    }
    return entry.value;
}
function setCache(key, value, ttlMs) {
    if (CACHE.size >= MAX_CACHE_SIZE) {
        // Simple eviction: remove first key
        const firstKey = CACHE.keys().next().value;
        if (firstKey)
            CACHE.delete(firstKey);
    }
    CACHE.set(key, { value, expiresAt: Date.now() + ttlMs });
}
export const webFetchSkill = {
    name: "web_fetch",
    description: "Fetch and extract READ-ONLY content from a specific URL. Use this for articles, documentation, or static pages. DO NOT use this for social media (Twitter, WeChat) or web apps - use 'browser' skill instead. If you are already running a browser session, use 'browser_action' to navigate instead of this tool.",
    tools: [
        {
            definition: {
                name: "web_fetch",
                description: "Fetch and extract readable content from a URL. Supports converting HTML to Markdown. READ-ONLY.",
                parameters: {
                    type: "object",
                    properties: {
                        url: { type: "string", description: "The URL to fetch." },
                        extractMode: { type: "string", enum: ["markdown", "text"], default: "markdown", description: "Format of the extracted content." },
                        maxChars: { type: "number", default: 100000, description: "Maximum characters to return. Default 100k." }
                    },
                    required: ["url"]
                },
                enterprise: {
                    namespace: "network",
                    capability: "web_fetch",
                    sideEffect: "none",
                    risk: "medium",
                    reversible: true,
                    idempotent: true,
                    approval: "never",
                    estimatedLatencyClass: "short",
                    estimatedCostClass: "low",
                    executionMode: "parallel",
                },
            },
            execute: async (args) => {
                const { url, extractMode = "markdown", maxChars = 100000 } = args;
                // Check cache
                const cacheKey = `fetch:${url}:${extractMode}`;
                const cached = getCache(cacheKey);
                if (cached)
                    return JSON.stringify(cached);
                try {
                    // Fetch with robust headers
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
                    const res = await fetch(url, {
                        headers: {
                            // 不在 UA 中暴露品牌（会随请求发给外部服务器）
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
                            "Accept-Language": "en-US,en;q=0.9"
                        },
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (!res.ok) {
                        return JSON.stringify({ error: `Failed to fetch URL: ${res.status} ${res.statusText}` });
                    }
                    // TODO: Check content-type to avoid downloading binaries
                    const contentType = res.headers.get("content-type") || "";
                    if (!contentType.includes("text/") && !contentType.includes("json") && !contentType.includes("xml")) {
                        return JSON.stringify({ error: `Unsupported content-type: ${contentType}` });
                    }
                    const html = await res.text();
                    // Extract
                    let extracted = await extractReadableContent({
                        html,
                        url,
                        extractMode: extractMode
                    });
                    // --- Jina Reader Fallback for SPAs ---
                    // If the content looks like a SPA shell (empty root, script tags) or is very short,
                    // try using Jina Reader (r.jina.ai) which runs a headless browser.
                    const isSpa = html.includes('<div id="root">') || html.includes('window._MODERNJS_ROUTE_MANIFEST') || html.includes('window.__nuxt');
                    const isPoorContent = !extracted || extracted.text.length < 500;
                    if ((isSpa || isPoorContent) && !url.includes("r.jina.ai")) {
                        console.log(`[web_fetch] Detected SPA or poor content (${extracted?.text?.length || 0} chars). Falling back to Jina Reader: ${url}`);
                        try {
                            const jinaUrl = `https://r.jina.ai/${url}`;
                            const jinaRes = await fetch(jinaUrl, {
                                headers: { "User-Agent": "Mozilla/5.0 (compatible)" } // 不暴露品牌
                            });
                            if (jinaRes.ok) {
                                const jinaText = await jinaRes.text();
                                // Jina returns raw Markdown.
                                if (jinaText && jinaText.length > 200) {
                                    extracted = {
                                        title: extracted?.title || "External Content",
                                        text: jinaText,
                                        // Mock other fields required by the type if needed, or rely on partial
                                        content: jinaText,
                                        textContent: jinaText,
                                        length: jinaText.length,
                                        excerpt: "",
                                        byline: "Jina Reader",
                                        dir: "ltr",
                                        siteName: "External"
                                    };
                                }
                            }
                        }
                        catch (e) {
                            console.warn(`[web_fetch] Jina fallback failed: ${e.message}`);
                        }
                    }
                    if (!extracted) {
                        return JSON.stringify({ error: "Failed to extract content from the page." });
                    }
                    // Truncate
                    const { text, truncated } = truncateText(extracted.text, maxChars);
                    const result = {
                        url,
                        title: extracted.title,
                        content: text,
                        truncated,
                        mode: extractMode
                    };
                    // Cache for 15 minutes
                    setCache(cacheKey, result, 15 * 60 * 1000);
                    return JSON.stringify(result, null, 2);
                }
                catch (e) {
                    if (e.name === 'AbortError') {
                        return JSON.stringify({ error: "Request timed out after 30 seconds." });
                    }
                    return JSON.stringify({ error: `Exception during fetch: ${e.message}` });
                }
            }
        }
    ]
};
