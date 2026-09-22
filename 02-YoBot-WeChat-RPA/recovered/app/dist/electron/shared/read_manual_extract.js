/**
 * 从一轮对话里提取 read_manual 调用记录。
 *
 * 这是 client_context 中价值最高的一项（SOP_DOCS_MAINTENANCE_AND_RELEASE.md §6.3）：
 * 无需下载 trace 就能区分三种完全不同的失败——
 *   found:false        → 精确的文档缺口，文件名已给出
 *   数组为空           → agent 压根没查文档就作答，index.md 引导不足
 *   全 true 但被点踩   → 文档存在却没解决问题，是内容质量问题
 *
 * 放在 shared 而非 ui：纯函数、无 react/electron 依赖，可以被 tsc 检查、被 node 直接测。
 */
import { isReadManualTool, skillFromReadManualTool, isManualNotFound } from './manual_marker.js';
function toolNameOf(c) {
    return c.toolName || c.name;
}
function topicOf(c) {
    const args = c.toolArgs || c.arguments || {};
    const t = args.topic;
    return typeof t === 'string' ? t : '(unknown)';
}
/**
 * 提取指定一轮的调用记录。
 *
 * 「一轮」= 从 userMessageId 那条用户消息之后，到下一条用户消息之前。
 * 不做这个切分的话，同一 session 里前几轮的文档调用会被算进这次反馈，
 * 于是「点踩时 agent 查了哪些文档」这个判断直接失真。
 *
 * userMessageId 找不到时返回空数组，而不是退化成「全部消息」——
 * 宁可少报，也不要报一份看起来合理但其实错位的数据。
 */
export function extractReadManualCalls(messages, userMessageId) {
    let slice = messages;
    if (userMessageId) {
        const start = messages.findIndex(m => m.id === userMessageId);
        if (start < 0)
            return [];
        const rest = messages.slice(start + 1);
        const nextUser = rest.findIndex(m => m.role === 'user');
        slice = nextUser >= 0 ? rest.slice(0, nextUser) : rest;
    }
    // 先收调用，再回填结果：工具结果可能在同一条消息的后续 content 里，
    // 也可能是独立的 toolResult 消息，两种形态都出现过。
    const calls = [];
    const byId = new Map();
    const pendingByTool = new Map();
    const applyResult = (key, result) => {
        let call;
        if (key.id && byId.has(key.id)) {
            call = byId.get(key.id);
        }
        else if (key.tool) {
            // 无 toolCallId 时按同名工具的调用顺序配对（FIFO）
            const queue = pendingByTool.get(key.tool);
            call = queue && queue.length ? queue.shift() : undefined;
        }
        if (call)
            call.found = !isManualNotFound(result);
    };
    for (const msg of slice) {
        const contents = Array.isArray(msg.content) ? msg.content : [];
        for (const c of contents) {
            const tool = toolNameOf(c);
            const isCall = c.type === 'tool_call' || c.type === 'toolCall';
            const isResult = c.type === 'tool_result' || c.type === 'toolResult';
            if (isCall && isReadManualTool(tool)) {
                const call = {
                    skill: skillFromReadManualTool(tool),
                    topic: topicOf(c),
                    // 默认 true：只有明确匹配到「未找到」标记才记 false。
                    // 反过来（默认 false）会把结果丢失误报成文档缺口，凭空制造工作量。
                    found: true,
                };
                calls.push(call);
                const cid = c.toolCallId || c.id;
                if (cid)
                    byId.set(cid, call);
                if (!pendingByTool.has(tool))
                    pendingByTool.set(tool, []);
                pendingByTool.get(tool).push(call);
            }
            else if (isResult && isReadManualTool(tool)) {
                applyResult({ id: c.toolCallId || c.id, tool }, c.toolResult);
            }
        }
        // 独立的 toolResult 消息形态
        if (msg.role === 'toolResult' && isReadManualTool(msg.toolName)) {
            const text = contents.find(c => typeof c.text === 'string');
            applyResult({ id: msg.toolCallId, tool: msg.toolName }, text?.text);
        }
    }
    return calls;
}
/** 流式 UI 的 StructuredStep[] 形态（tool 步骤直接带 name/args/result） */
export function extractFromSteps(steps) {
    const out = [];
    for (const s of steps || []) {
        if (s.type !== 'tool' || !isReadManualTool(s.name))
            continue;
        out.push({
            skill: skillFromReadManualTool(s.name),
            topic: typeof s.args?.topic === 'string' ? s.args.topic : '(unknown)',
            found: s.result === undefined ? true : !isManualNotFound(s.result),
        });
    }
    return out;
}
