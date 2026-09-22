import { LLMManager } from "../agent/llm/manager.js";
/**
 * Fireflow(workflow 项目)线上知识库检索客户端。
 *
 * 子 Agent 的 `AGENT.md knowledge:` 里以 `@wf/<kbId>` 引用线上知识库；kernel 检索时对这些
 * 引用调本模块，而非本地向量库。鉴权直接用 Agent 手里的用户登录 JWT(fireflow 用
 * `SUPABASE_JWT_SECRET` 验签，解出同一个 userId → 只能检索用户自己的 KB)。
 *
 * 契约要点:
 *   - fireflow 的 `/search` **已在服务端过 scoreThreshold + rerank**，返回即可用，不再进本地候选门。
 *   - **任何失败/超时都降级为空**，绝不阻塞客户回复(公网往返不可靠是走线上的最大代价)。
 */
const DEFAULT_FIREFLOW_BASE = "https://fireflow.yokoagi.com";
// 检索在 LLM 调用前、结果要进 prompt，fireflow 慢就直接拖慢回复。默认 15s（覆盖冷启动/
// embedding 开销），可用 FIREFLOW_TIMEOUT_MS 调。超时即降级为无知识注入，不阻塞回复。
const TIMEOUT_MS = Number(process.env.FIREFLOW_TIMEOUT_MS) || 15000;
function baseUrl() {
    const raw = process.env.FIREFLOW_BASE_URL || process.env.VITE_FIREFLOW_BASE_URL || DEFAULT_FIREFLOW_BASE;
    return raw.replace(/\/+$/, "");
}
/** fireflow 的 metadata 可能是 JSON 字符串或对象;容错取 image_url,任何异常回落 undefined。 */
function extractImageUrl(metadata) {
    if (!metadata)
        return undefined;
    try {
        const meta = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
        const url = meta?.image_url;
        return typeof url === "string" && url.trim() ? url : undefined;
    }
    catch {
        return undefined;
    }
}
export async function searchWorkflowKnowledge(kbIds, query, opts) {
    const llm = LLMManager.getInstance();
    const token = llm.getAuthToken?.();
    if (!token) {
        console.warn("[WorkflowRAG] 无 auth token，跳过线上知识库检索");
        return [];
    }
    const channelId = llm.getChannelId?.();
    const perKb = await Promise.all(kbIds.map(async (kbId) => {
        const url = `${baseUrl()}/v1/knowledge-bases/${encodeURIComponent(kbId)}/search`;
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    ...(channelId ? { "X-Channel-ID": channelId } : {}),
                },
                body: JSON.stringify({
                    query,
                    topK: opts?.topK ?? 5,
                    ...(typeof opts?.scoreThreshold === "number" ? { scoreThreshold: opts.scoreThreshold } : {}),
                }),
                signal: ctrl.signal,
            });
            if (!res.ok) {
                console.warn(`[WorkflowRAG] KB ${kbId} 检索 HTTP ${res.status}`);
                return [];
            }
            const json = await res.json();
            const rows = Array.isArray(json?.data) ? json.data : [];
            // 服务端(fireflow)顺带回传的库名;老服务端没这个字段时回落 id 形式,向后兼容。
            const kbName = typeof json?.name === "string" && json.name.trim() ? json.name.trim() : undefined;
            return rows
                .filter((r) => r && typeof r.text === "string" && r.text.trim())
                .map((r, i) => ({
                id: `wf:${kbId}:${i}`,
                text: String(r.text),
                source: "workflow",
                path: kbName ? `工作流知识库·${kbName}` : `工作流知识库(${kbId})`,
                startLine: 0,
                createdAt: Date.now(),
                // IMAGE 文档命中时,fireflow 在 metadata.image_url 回带签名 URL(见
                // workflow/src/routes/knowledge_base.ts)。捞出来走令牌通道,不进 prompt。
                imageUrl: extractImageUrl(r.metadata),
                relevance: typeof r._distance === "number"
                    ? Math.max(0, Math.min(1, 1 - r._distance))
                    : undefined,
                meta: {
                    memoryType: "preference",
                    confidence: 1,
                    hitCount: 0,
                    usedCount: 0,
                    confirmedByUser: true,
                    sourceTraceIds: [],
                    tags: [],
                },
            }));
        }
        catch (e) {
            console.warn(`[WorkflowRAG] KB ${kbId} 检索失败: ${e?.name === "AbortError" ? `超时(${TIMEOUT_MS}ms)` : e?.message || e}`);
            return [];
        }
        finally {
            clearTimeout(timer);
        }
    }));
    return perKb.flat();
}
