/**
 * assistant 消息 → 它所回应的用户消息 id。
 *
 * 为什么这件小事值得单独一个文件并配测试：反馈的数据库行是以**用户消息** id 建的
 * （`logUserQuestion(sessionId, userMsg.id, ...)`）。若把 assistant 消息 id 传给
 * `/v1/agent/logs/feedback`，服务端执行的是
 *   `update ... where message_id = <assistant id>`
 * 匹配 0 行，返回 200，前端一切正常——**反馈静默消失**，且不会有任何报错提示。
 *
 * 这类"看起来成功但什么也没发生"的故障只能靠测试挡住，不能靠 review 时的注意力。
 */
export function mapAssistantToUserMessage(messages) {
    const map = new Map();
    let lastUserId = null;
    for (const m of messages || []) {
        if (!m || !m.id)
            continue;
        if (m.role === 'user') {
            lastUserId = m.id;
        }
        else if (m.role === 'assistant' && lastUserId) {
            // 一轮里可能有多条 assistant 消息（工具调用穿插），它们共用同一个用户消息 id。
            map.set(m.id, lastUserId);
        }
        // tool / toolResult / system 消息不改变"当前轮次"的归属
    }
    return map;
}
