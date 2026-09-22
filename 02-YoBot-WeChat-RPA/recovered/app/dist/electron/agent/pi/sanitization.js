import { REPLAY_ECHO_SIGNATURES } from "./reasoning_replay.js";
function normalizeStructuredContent(content) {
    if (Array.isArray(content)) {
        return content;
    }
    if (typeof content === "string") {
        return [{ type: "text", text: content }];
    }
    if (content && typeof content === "object") {
        return [content];
    }
    return [];
}
function finiteNumber(...values) {
    for (const value of values) {
        if (typeof value === "number" && Number.isFinite(value))
            return value;
    }
    return 0;
}
function hasCompleteAssistantUsage(usage) {
    return !!usage
        && typeof usage === "object"
        && Number.isFinite(usage.input)
        && Number.isFinite(usage.output)
        && Number.isFinite(usage.cacheRead)
        && Number.isFinite(usage.cacheWrite)
        && Number.isFinite(usage.totalTokens)
        && !!usage.cost
        && typeof usage.cost === "object"
        && Number.isFinite(usage.cost.input)
        && Number.isFinite(usage.cost.output)
        && Number.isFinite(usage.cost.cacheRead)
        && Number.isFinite(usage.cost.cacheWrite)
        && Number.isFinite(usage.cost.total);
}
/**
 * Pi 0.83 treats usage as required on every assistant message and reads
 * usage.totalTokens while sizing the context before the model request starts.
 * Gateway/preview history predates that contract and can contain only
 * role/content/timestamp, so normalize both missing and legacy-shaped usage.
 */
function normalizeAssistantUsage(usage) {
    if (hasCompleteAssistantUsage(usage))
        return usage;
    const raw = usage && typeof usage === "object" ? usage : {};
    const rawCost = raw.cost && typeof raw.cost === "object" ? raw.cost : {};
    const input = finiteNumber(raw.input, raw.prompt_tokens);
    const output = finiteNumber(raw.output, raw.completion_tokens);
    const cacheRead = finiteNumber(raw.cacheRead, raw.cache_read, raw.prompt_tokens_details?.cached_tokens);
    const cacheWrite = finiteNumber(raw.cacheWrite, raw.cache_write, raw.prompt_tokens_details?.cache_write_tokens);
    const totalTokens = finiteNumber(raw.totalTokens, raw.total_tokens, input + output + cacheRead + cacheWrite);
    return {
        ...raw,
        input,
        output,
        cacheRead,
        cacheWrite,
        totalTokens,
        cost: {
            ...rawCost,
            input: finiteNumber(rawCost.input),
            output: finiteNumber(rawCost.output),
            cacheRead: finiteNumber(rawCost.cacheRead),
            cacheWrite: finiteNumber(rawCost.cacheWrite),
            total: finiteNumber(rawCost.total),
        },
    };
}
export function normalizeMessageContents(messages) {
    let changed = false;
    const normalized = messages.map((message) => {
        const role = message?.role;
        if (role !== "assistant" && role !== "toolResult" && role !== "tool") {
            return message;
        }
        const messageAny = message;
        const content = messageAny?.content;
        const contentNeedsNormalization = !Array.isArray(content);
        const usageNeedsNormalization = role === "assistant" && !hasCompleteAssistantUsage(messageAny.usage);
        if (!contentNeedsNormalization && !usageNeedsNormalization) {
            return message;
        }
        changed = true;
        return {
            ...messageAny,
            content: contentNeedsNormalization ? normalizeStructuredContent(content) : content,
            ...(role === "assistant" ? { usage: normalizeAssistantUsage(messageAny.usage) } : {}),
        };
    });
    return { messages: normalized, changed };
}
/**
 * `pruneReplayedReasoning` = 连**回显型**签名的思考块一起裁掉（只在发送侧生效）。
 *
 * 「回显型」指签名值本身就是它到达时的字段名（`reasoning_content` 等，见
 * pi/reasoning_replay.ts）——那是来源标签，不是「要还回去」的协议要求。Anthropic 的
 * 真签名与 redacted 载荷不在该集合里，任何模式下都保留：丢了它签名校验就过不了。
 *
 * **必须全裁，不能只留最近几轮**：保留一部分意味着上一轮的消息在下一轮被改写，
 * 前缀从改写点起整段作废（就是滑动窗口那种失败模式）。全裁对每条历史消息是同一个
 * 确定性投影，逐字节单调，prefix_monotonic 的断言据此成立。
 */
export function pruneAssistantThinkingContent(messages, options = {}) {
    let changed = false;
    const pruned = messages.map((message) => {
        const role = message?.role;
        if (role !== "assistant") {
            return message;
        }
        const content = message?.content;
        if (!Array.isArray(content)) {
            return message;
        }
        const filtered = content.filter((part) => {
            if (part?.type !== "thinking")
                return true;
            // Signed blocks are provider protocol state, not disposable chain-of-thought text.
            // Kimi/OpenAI-compatible APIs replay them as reasoning_content; Anthropic uses the
            // signature (including redacted payloads) to preserve multi-turn thinking continuity.
            const signature = typeof part.thinkingSignature === "string" ? part.thinkingSignature.trim() : "";
            if (!signature)
                return false;
            if (!options.pruneReplayedReasoning)
                return true;
            return !REPLAY_ECHO_SIGNATURES.has(signature);
        });
        if (filtered.length === content.length) {
            return message;
        }
        changed = true;
        return {
            ...message,
            content: filtered
        };
    });
    return { messages: pruned, changed };
}
function extractTextContent(content) {
    if (typeof content === "string") {
        return content;
    }
    if (Array.isArray(content)) {
        return content
            .filter((part) => part?.type === "text" && typeof part.text === "string")
            .map((part) => part.text)
            .join("\n");
    }
    return "";
}
function compactText(text, limit) {
    if (!text || text.length <= limit)
        return text;
    const headSize = Math.floor(limit * 0.55);
    const tailSize = Math.floor(limit * 0.25);
    const removedChars = text.length - headSize - tailSize;
    return `${text.slice(0, headSize)}\n... [Historical output compacted: removed ${removedChars} chars] ...\n${text.slice(-tailSize)}`;
}
function tryParseJson(text) {
    const trimmed = text.trim();
    if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("[")))
        return undefined;
    try {
        return JSON.parse(trimmed);
    }
    catch {
        return undefined;
    }
}
function formatCompactValue(value) {
    if (value === null || value === undefined)
        return String(value);
    if (typeof value === "string")
        return value.length > 160 ? `${value.slice(0, 157)}...` : value;
    if (typeof value === "number" || typeof value === "boolean")
        return String(value);
    if (Array.isArray(value))
        return `[array:${value.length}]`;
    if (typeof value === "object")
        return "{object}";
    return String(value);
}
function collectImportantFields(value, prefix = "", depth = 0, out = []) {
    if (out.length >= 28 || depth > 4 || value === null || value === undefined)
        return out;
    if (Array.isArray(value)) {
        out.push(`${prefix || "items"}Count=${value.length}`);
        for (const item of value.slice(0, 3)) {
            collectImportantFields(item, prefix, depth + 1, out);
            if (out.length >= 28)
                break;
        }
        return out;
    }
    if (typeof value !== "object")
        return out;
    const important = /^(id|appId|appName|workflowId|workflowName|nodeId|nodeName|runId|kbId|name|title|success|ok|status|state|code|error|message|reason|published|isOfficial)$/i;
    for (const [key, fieldValue] of Object.entries(value)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (important.test(key)) {
            out.push(`${path}=${formatCompactValue(fieldValue)}`);
            if (out.length >= 28)
                return out;
        }
    }
    for (const [key, fieldValue] of Object.entries(value)) {
        if (fieldValue && typeof fieldValue === "object") {
            collectImportantFields(fieldValue, prefix ? `${prefix}.${key}` : key, depth + 1, out);
            if (out.length >= 28)
                return out;
        }
    }
    return out;
}
function summarizeToolResultText(text) {
    const parsed = tryParseJson(text);
    if (parsed !== undefined) {
        const fields = collectImportantFields(parsed);
        if (fields.length > 0) {
            return fields.join("; ");
        }
    }
    const lines = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 8)
        .join(" | ");
    return compactText(lines || text.trim(), 1200);
}
function summarizeToolCallPart(part) {
    const name = part?.name || part?.toolName || part?.function?.name || "unknown";
    const args = part?.arguments ?? part?.parameters ?? part?.input ?? part?.function?.arguments;
    let argsText = "";
    if (args !== undefined) {
        argsText = typeof args === "string" ? args : JSON.stringify(args);
    }
    return `${name}(${compactText(argsText, 500)})`;
}
function makeHistoricalObservationMessage(source, body) {
    return {
        ...(source || {}),
        role: "assistant",
        content: [{
                type: "text",
                text: [
                    "[Historical tool observation - reference only]",
                    body
                ].join("\n")
            }],
        timestamp: source?.timestamp
    };
}
export function pruneToolProtocolArtifacts(messages) {
    let changed = false;
    const pruned = [];
    for (const message of messages) {
        const role = message?.role;
        if (role === "tool" || role === "toolResult") {
            changed = true;
            const msgAny = message;
            const toolName = msgAny.toolName || msgAny.name || "unknown";
            const callId = msgAny.toolCallId || msgAny.tool_call_id;
            const text = extractTextContent(msgAny.content);
            const result = summarizeToolResultText(text);
            pruned.push(makeHistoricalObservationMessage(message, `Tool result: ${toolName}${callId ? ` callId=${callId}` : ""}\nResult: ${result}`));
            continue;
        }
        if (role !== "assistant") {
            pruned.push(message);
            continue;
        }
        const content = message?.content;
        if (!Array.isArray(content)) {
            pruned.push(message);
            continue;
        }
        const toolCalls = content.filter((part) => part?.type === "toolCall" || part?.type === "tool_call");
        const filtered = content.filter((part) => part?.type !== "toolCall" && part?.type !== "tool_call");
        if (filtered.length === content.length) {
            pruned.push(message);
            continue;
        }
        changed = true;
        if (filtered.length > 0) {
            pruned.push({
                ...message,
                content: filtered
            });
        }
        const calls = toolCalls.map(summarizeToolCallPart).join("; ");
        pruned.push(makeHistoricalObservationMessage(message, `Tool call(s): ${calls}`));
    }
    return { messages: pruned, changed };
}
/**
 * Removes orphaned tool-protocol messages after the history has been sliced
 * (e.g. by limitHistoryTurns) so we never send a tool_call without its matching
 * tool result, or a tool result without its originating call. Both shapes make
 * OpenAI / Anthropic reject the request.
 *
 * Pairing is by mutual id presence within the window:
 *  - a toolResult whose callId has no matching assistant toolCall is dropped;
 *  - an assistant toolCall part whose id has no matching toolResult is dropped
 *    (and if that empties the assistant message, the message is dropped).
 *
 * Unlike the old pruneToolProtocolArtifacts, this NEVER rewrites tool calls into
 * plain text — surviving calls/results stay as native structured protocol
 * messages, so the model keeps seeing real tool-call examples.
 */
export function pruneOrphanToolMessages(messages) {
    const callIds = new Set();
    const resultIds = new Set();
    const toolCallId = (part) => part?.id || part?.toolCallId || part?.tool_call_id;
    const resultId = (msg) => msg?.toolCallId || msg?.tool_call_id;
    for (const msg of messages) {
        const role = msg?.role;
        if (role === "assistant" && Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part?.type === "toolCall" || part?.type === "tool_call") {
                    const id = toolCallId(part);
                    if (id)
                        callIds.add(id);
                }
            }
        }
        else if (role === "tool" || role === "toolResult") {
            const id = resultId(msg);
            if (id)
                resultIds.add(id);
        }
    }
    let changed = false;
    const pruned = [];
    for (const msg of messages) {
        const role = msg?.role;
        if (role === "tool" || role === "toolResult") {
            const id = resultId(msg);
            if (!id || !callIds.has(id)) {
                changed = true; // orphan result: its call was sliced away
                continue;
            }
            pruned.push(msg);
            continue;
        }
        if (role === "assistant" && Array.isArray(msg.content)) {
            const content = msg.content;
            const filtered = content.filter((part) => {
                if (part?.type !== "toolCall" && part?.type !== "tool_call")
                    return true;
                const id = toolCallId(part);
                return id ? resultIds.has(id) : false; // orphan call (missing id or result)
            });
            if (filtered.length === content.length) {
                pruned.push(msg);
                continue;
            }
            changed = true;
            if (filtered.length > 0) {
                pruned.push({ ...msg, content: filtered });
            }
            continue; // empty assistant message dropped
        }
        pruned.push(msg);
    }
    return { messages: pruned, changed };
}
export function mergeConsecutiveUserTurns(previous, current) {
    const mergedContent = [
        ...(Array.isArray(previous.content) ? previous.content : []),
        ...(Array.isArray(current.content) ? current.content : []),
    ];
    return {
        ...current,
        content: mergedContent,
        timestamp: current.timestamp ?? previous.timestamp,
    };
}
/**
 * Validates and fixes conversation turn sequences for Anthropic API.
 * Anthropic requires strict alternating user→assistant pattern.
 * Merges consecutive user messages together.
 */
export function validateAnthropicTurns(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
        return messages;
    }
    const result = [];
    let lastRole;
    for (const msg of messages) {
        if (!msg || typeof msg !== "object") {
            result.push(msg);
            continue;
        }
        const msgRole = msg.role;
        if (!msgRole) {
            result.push(msg);
            continue;
        }
        if (msgRole === lastRole && lastRole === "user") {
            const lastMsg = result[result.length - 1];
            const currentMsg = msg;
            if (lastMsg && typeof lastMsg === "object") {
                const lastUser = lastMsg;
                const merged = mergeConsecutiveUserTurns(lastUser, currentMsg);
                result[result.length - 1] = merged;
                continue;
            }
        }
        result.push(msg);
        lastRole = msgRole;
    }
    return result;
}
function isPinnedContextMessage(message) {
    const role = message?.role;
    return role === "compactionSummary" || role === "branchSummary";
}
function collectLatestPinnedContext(messages, endExclusive) {
    const latestByRole = new Map();
    for (let i = 0; i < endExclusive; i++) {
        const message = messages[i];
        if (!isPinnedContextMessage(message))
            continue;
        latestByRole.set(message.role, { index: i, message });
    }
    return Array.from(latestByRole.values())
        .sort((a, b) => a.index - b.index)
        .map(item => item.message);
}
/**
 * Limits conversation history to the last N user turns (and their associated
 * assistant responses), while preserving the latest generated summaries that
 * carry compacted long-running session context.
 */
export function limitHistoryTurns(messages, limit) {
    if (!limit || limit <= 0 || messages.length === 0) {
        return messages;
    }
    let userCount = 0;
    let lastUserIndex = messages.length;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
            userCount++;
            if (userCount > limit) {
                const tail = messages.slice(lastUserIndex);
                const tailSet = new Set(tail);
                const pinned = collectLatestPinnedContext(messages, lastUserIndex)
                    .filter(message => !tailSet.has(message));
                return [...pinned, ...tail];
            }
            lastUserIndex = i;
        }
    }
    return messages;
}
/**
 * Detects if the generated text contains a repetitive loop.
 * Heuristic: Checks if the end of the text contains a string of length > 15
 * that has been repeated at least 5 times consecutively.
 * Increased threshold to prevent false positives with Markdown tables.
 */
export function detectRepetitiveLoop(text) {
    if (!text || text.length < 100)
        return false;
    const tail = text.slice(-1000); // Check last 1000 chars to allow longer patterns
    // Strategy: Try to find a repeating pattern at the very end
    // We check lengths from 15 to tail.length / 5
    for (let len = 15; len <= tail.length / 5; len++) {
        const p1 = tail.slice(-len);
        const p2 = tail.slice(-len * 2, -len);
        const p3 = tail.slice(-len * 3, -len * 2);
        const p4 = tail.slice(-len * 4, -len * 3);
        const p5 = tail.slice(-len * 5, -len * 4);
        if (p1 === p2 && p2 === p3 && p3 === p4 && p4 === p5) {
            // Found 5 repetitions of a string of length 'len'
            return true;
        }
    }
    return false;
}
function pruneTextHeadTail(text, limit) {
    if (!text || text.length <= limit)
        return text;
    const headSize = Math.floor(limit * 0.45);
    const tailSize = Math.floor(limit * 0.35);
    const removedChars = text.length - headSize - tailSize;
    return `${text.slice(0, headSize)}\n\n... [Output Truncated: Removed ${removedChars} characters] ...\n\n${text.slice(-tailSize)}`;
}
function rankBrowserLines(body, url, maxItems) {
    const lines = body.split("\n");
    const isDouyinPage = /douyin\.com/i.test(url);
    const isSearchPage = /\/search\/|type=general/i.test(url);
    const isModalPage = /modal_id=/i.test(url);
    const ranked = lines
        .map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed || /<InlineTextBox\b/i.test(trimmed))
            return null;
        let score = 0;
        if (/<(textbox|searchbox|button|link|combobox|dialog|menuitem|tab|listitem|checkbox|radio|switch|textarea|input)\b/i.test(trimmed))
            score += 80;
        if (/name="/i.test(trimmed))
            score += 12;
        if (/value="[^"]+"/i.test(trimmed))
            score += 16;
        if (/url="[^"]+"/i.test(trimmed))
            score += 10;
        if (/name="[^"]*(评论|发送|搜索|留下你的精彩评论吧|feed-comment-icon|openclaw|教程|发布)[^"]*"/i.test(trimmed))
            score += 70;
        if (isDouyinPage && /评论|发送|搜索|openclaw|留下你的精彩评论吧/i.test(trimmed))
            score += 30;
        if (isSearchPage && /openclaw|教程|视频|url="/i.test(trimmed))
            score += 25;
        if (isModalPage && /评论|发送|input|textbox|发布/i.test(trimmed))
            score += 60;
        if (isModalPage)
            score += Math.floor((idx / Math.max(lines.length, 1)) * 24);
        if (score <= 0)
            return null;
        return { trimmed, score, idx };
    })
        .filter((item) => !!item)
        .sort((a, b) => b.score - a.score || b.idx - a.idx);
    const unique = [];
    const seen = new Set();
    for (const item of ranked) {
        if (seen.has(item.trimmed))
            continue;
        seen.add(item.trimmed);
        unique.push(item.trimmed);
        if (unique.length >= maxItems)
            break;
    }
    return unique;
}
function parseBrowserSnapshot(text) {
    const title = text.match(/\*\*Title\*\*:\s*(.+)/)?.[1]?.trim() || "";
    const url = text.match(/\*\*URL\*\*:\s*(.+)/)?.[1]?.trim() || "";
    const action = text.match(/Action '([^']+)' performed successfully\./)?.[1]?.trim() || "";
    const tabs = Array.from(text.matchAll(/^- \[([^\]]+)\]\s+(.+)$/gm)).slice(0, 6).map(m => `[${m[1]}] ${m[2]}`);
    const hasLoginSignal = /Login Page Detected\s*\(/i.test(text) ||
        /Please log in manually/i.test(text) ||
        /UserInteractionRequiredError/i.test(text) ||
        /type="password"|inputtype="password"/i.test(text);
    const marker = "### Interactive Elements:\n";
    const markerIndex = text.indexOf(marker);
    const body = markerIndex >= 0 ? text.slice(markerIndex + marker.length) : text;
    const elements = rankBrowserLines(body, url, 80);
    return { title, url, action, tabs, hasLoginSignal, markerIndex, body, elements };
}
function compactBrowserSnapshotText(text, limit, summaryOnly) {
    if (!text)
        return text;
    const parsed = parseBrowserSnapshot(text);
    const summaryLines = [
        "## Browser Snapshot Summary",
        `- Action: ${parsed.action || "unknown"}`,
        `- Title: ${parsed.title || "unknown"}`,
        `- URL: ${parsed.url || "unknown"}`,
        `- LoginSignal: ${parsed.hasLoginSignal ? "yes" : "no"}`,
        `- Tabs: ${parsed.tabs.length > 0 ? parsed.tabs.join(" | ") : "none"}`,
        `- KeyElementsCount: ${parsed.elements.length}`
    ];
    const summaryElements = parsed.elements.slice(0, summaryOnly ? 15 : 36);
    const summary = `${summaryLines.join("\n")}\n${summaryElements.map((line, idx) => `${idx + 1}. ${line}`).join("\n")}`;
    if (summaryOnly) {
        return pruneTextHeadTail(summary, limit);
    }
    if (parsed.markerIndex < 0) {
        return pruneTextHeadTail(summary + "\n\n" + text, limit);
    }
    if (text.length <= limit) {
        return text;
    }
    const isModalPage = /modal_id=/i.test(parsed.url);
    const isSearchPage = /\/search\/|type=general/i.test(parsed.url);
    const focused = rankBrowserLines(parsed.body, parsed.url, isModalPage ? 150 : (isSearchPage ? 140 : 100));
    const focusedBlock = focused.length > 0 ? focused.join("\n") : parsed.body.slice(0, Math.min(4000, parsed.body.length));
    let compacted = `${summary}\n\n### Interactive Elements (Compacted)\n${focusedBlock}\n\n... [Browser Snapshot Compacted: original ${text.length} chars] ...`;
    if (compacted.length > limit) {
        compacted = pruneTextHeadTail(compacted, limit);
    }
    return compacted;
}
/** 内联图片的原始字节数。远端 URL 返回 0——它不占我们的上下文预算。 */
export function inlineImagePayloadBytes(url) {
    if (typeof url !== "string")
        return 0;
    const comma = url.indexOf(",");
    if (!url.startsWith("data:") || comma < 0)
        return 0;
    // base64 长度 → 原始字节数
    return Math.floor((url.length - comma - 1) * 3 / 4);
}
const imagePartUrl = (part) => part?.image_url?.url ?? part?.url ?? part?.source?.data;
const isImagePart = (part) => !!part && (part.type === "image_url" || part.type === "image");
/**
 * 一次请求里**所有**内联图片的总字节预算；超了就从最旧的开始摘。
 *
 * 为什么单张限额不够：`pruneOversizedImages` 是逐张比对的，管不住"每张都不超限、加起来撑爆"
 * 这一种形态——而线上真实事故正是这种（三张 620–670KB 的手机照片，一张都够不到单张阈值，
 * 合计却让该会话连续 13.5 小时每一轮都被顶回，含纯文本的「你好」）。
 *
 * 三条刻意的取舍：
 *   1. **只摘图，不删消息。** token 口径的裁剪归压缩管，两套机制不要互相打架。
 *   2. **从最旧的开始摘，最后一条消息永远不动。** 最后一条是用户这一轮发的，摘了等于没回答他。
 *   3. **一旦摘掉就不会再回来**（历史里换成了文本占位）。这让缓存前缀在首次摘除之后重新稳定，
 *      而不是每轮重算——如果留给服务端去摘，客户端每轮还是要把这几 MB 重新发一遍。
 */
export function enforceInlineImageBudget(messages, maxTotalBytes) {
    // 预算按**线缆字节**算，也就是 data URL 字符串本身的长度，而不是解码后的原始字节。
    // 撞上限的是 HTTP 请求体，而请求体里躺的是 base64（比原始字节大 4/3）。用解码后的口径
    // 算预算会稳定低估 33%，"算着达标、发出去仍然超"。
    const wireBytes = (part) => {
        const url = imagePartUrl(part);
        if (typeof url !== "string" || !url.startsWith("data:"))
            return 0; // 远端 URL 不占我们的预算
        return url.length;
    };
    const messageBytes = (msg) => {
        if (!Array.isArray(msg?.content))
            return 0;
        return msg.content.reduce((inner, part) => inner + (isImagePart(part) ? wireBytes(part) : 0), 0);
    };
    // 逐条量一次、之后只维护增量。别把 total(next) 写进循环条件——那是每摘一张图就把
    // 整个历史重扫一遍，而这个函数触发时历史里正好躺着好几 MB 的 base64。
    const sizes = messages.map(messageBytes);
    let currentBytes = sizes.reduce((sum, n) => sum + n, 0);
    if (currentBytes <= maxTotalBytes)
        return { messages, changed: false, droppedImages: 0 };
    const next = messages.slice();
    let droppedImages = 0;
    // 最后一条消息不参与摘除（i < length - 1）。
    for (let i = 0; i < next.length - 1 && currentBytes > maxTotalBytes; i += 1) {
        const message = next[i];
        if (!Array.isArray(message?.content))
            continue;
        if (!message.content.some(isImagePart))
            continue;
        const content = message.content.map((part) => {
            if (!isImagePart(part))
                return part;
            droppedImages += 1;
            const bytes = inlineImagePayloadBytes(imagePartUrl(part));
            const mb = bytes > 0 ? `${(bytes / 1024 / 1024).toFixed(1)}MB ` : "";
            const path = part.image_url?.path || part.path;
            return {
                type: "text",
                text: `[系统提示] 此处原有一张${mb ? ` ${mb}` : ""}图片，因本次请求的图片总量超限已从历史中移除`
                    + `（保留会让这个会话之后每一轮都失败）。`
                    + (path ? `原图仍在 ${path}，需要时用文件/图像类工具读取。` : "")
                    + `不要假装你已经看过这张图。`,
            };
        });
        next[i] = { ...message, content };
        currentBytes -= sizes[i];
        sizes[i] = 0; // 图已换成文本，这条消息不再占图片预算
    }
    if (droppedImages === 0)
        return { messages, changed: false, droppedImages: 0 };
    return { messages: next, changed: true, droppedImages };
}
/**
 * 把历史里超限的图片换成文本说明。
 *
 * 这是给**已经中招的会话**用的解药。入口限幅（见 utils/image_bytes.ts）只能防住新的图，
 * 已经躺在历史里的那张不会自己消失：线上真实案例是用户 08-18 传了张 22MiB 的图，
 * 08-20 问一个毫不相干的问题照样 400 ——
 *   "the size of the input image (22 MiB) exceeds the limit (10 MiB)"
 * 每一轮都会把它重新发一遍，会话被永久毒化，用户换模型也没用（历史跟着走），
 * 只能弃用会话。所以每次请求前都要在这里兜一道。
 *
 * 只动**超限的**那张：没超限的图照常参与多模态推理，不能因为一张坏图殃及全部。
 */
export function pruneOversizedImages(messages, maxBytes) {
    let changed = false;
    const payloadBytes = inlineImagePayloadBytes;
    const next = messages.map((msg) => {
        if (!Array.isArray(msg?.content))
            return msg;
        let touched = false;
        const content = msg.content.map((part) => {
            if (!part || (part.type !== "image_url" && part.type !== "image"))
                return part;
            const url = part.image_url?.url ?? part.url ?? part.source?.data;
            const bytes = payloadBytes(url);
            if (bytes <= maxBytes)
                return part;
            touched = true;
            const mb = (bytes / 1024 / 1024).toFixed(1);
            const limitMb = (maxBytes / 1024 / 1024).toFixed(1);
            const path = part.image_url?.path || part.path;
            return {
                type: "text",
                text: `[系统提示] 此处原有一张 ${mb}MB 的图片，超过单张 ${limitMb}MB 的上下文限制，已从历史中移除` +
                    `（否则本会话之后每一轮都会因它而失败）。` +
                    (path ? `原图仍在 ${path}，需要时用文件/图像类工具读取。` : "") +
                    `不要假装你已经看过这张图。`,
            };
        });
        if (!touched)
            return msg;
        changed = true;
        return { ...msg, content };
    });
    return { messages: changed ? next : messages, changed };
}
export function pruneToolResultMessages(messages) {
    const browserSnapshotIndices = [];
    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const role = msg?.role;
        if (role !== "tool" && role !== "toolResult")
            continue;
        const content = typeof msg.content === "string"
            ? msg.content
            : Array.isArray(msg.content)
                ? msg.content.filter((part) => part?.type === "text").map((part) => part.text || "").join("\n")
                : "";
        if (content.includes("## Browser Snapshot") || content.includes("### Interactive Elements:")) {
            browserSnapshotIndices.push(i);
        }
    }
    const detailedStartIndex = Math.max(browserSnapshotIndices.length - 2, 0);
    let browserSnapshotCounter = 0;
    return messages.map((msg) => {
        const role = msg.role;
        if (role !== "tool" && role !== "toolResult") {
            return msg;
        }
        const msgAny = msg;
        const toolName = (msgAny.toolName || msgAny.name || "");
        const textContent = typeof msgAny.content === "string"
            ? msgAny.content
            : Array.isArray(msgAny.content)
                ? msgAny.content.filter((part) => part?.type === "text").map((part) => part.text || "").join("\n")
                : "";
        const isBrowserSnapshot = toolName === "browser_action" || textContent.includes("## Browser Snapshot") || textContent.includes("### Interactive Elements:");
        const summaryOnly = isBrowserSnapshot && browserSnapshotCounter < detailedStartIndex;
        const pruneLimit = isBrowserSnapshot ? (summaryOnly ? 3500 : 20000) : 8000;
        const transform = (text) => isBrowserSnapshot
            ? compactBrowserSnapshotText(text, pruneLimit, summaryOnly)
            : pruneTextHeadTail(text, pruneLimit);
        if (isBrowserSnapshot) {
            browserSnapshotCounter++;
        }
        if (typeof msgAny.content === "string") {
            return { ...msgAny, content: transform(msgAny.content) };
        }
        if (Array.isArray(msgAny.content)) {
            const content = msgAny.content.map((part) => {
                if (part?.type === "text" && typeof part.text === "string") {
                    return { ...part, text: transform(part.text) };
                }
                return part;
            });
            return { ...msgAny, content };
        }
        return msg;
    });
}
