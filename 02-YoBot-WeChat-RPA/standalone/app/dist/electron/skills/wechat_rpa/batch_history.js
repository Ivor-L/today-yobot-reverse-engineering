import { parseSinceToEpochMs } from "./data_manager.js";
const AUTO_DISCOVERY_MAX_SESSIONS = 500;
function positiveInteger(value, fallback, max, name) {
    if (value === undefined)
        return fallback;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
        throw new Error(`${name} 必须是 1~${max} 的整数`);
    }
    return parsed;
}
function sessionUpdateEpoch(session) {
    const parsed = new Date(session.last_updated).getTime();
    return Number.isNaN(parsed) ? null : parsed;
}
function requestedSessions(index, sinceEpochMs, requested) {
    if (requested === undefined) {
        // The sessions index can contain years of inactive chats and is not guaranteed to be sorted.
        // Selecting the first N entries both wastes I/O and can miss a newly active chat near the end.
        // Prefer sessions captured in this window; retain unknown timestamps conservatively, after the
        // known-active sessions, so malformed metadata cannot silently hide a possibly relevant chat.
        const candidates = index
            .map(session => ({ session, epoch: sessionUpdateEpoch(session) }))
            .filter(row => row.epoch === null || row.epoch >= sinceEpochMs)
            .sort((left, right) => (right.epoch ?? Number.NEGATIVE_INFINITY) - (left.epoch ?? Number.NEGATIVE_INFINITY));
        const selected = candidates.slice(0, AUTO_DISCOVERY_MAX_SESSIONS);
        return {
            targets: selected.map(row => row.session.name || row.session.id),
            eligible: candidates.length,
            inactiveExcluded: index.length - candidates.length,
            unknownLastUpdated: candidates.filter(row => row.epoch === null).length,
            truncated: candidates.length > selected.length,
        };
    }
    if (!Array.isArray(requested) || requested.length === 0) {
        throw new Error("sessionNames 传入时必须至少包含一个会话名或 ID");
    }
    const unique = [...new Set(requested.map(value => String(value || "").trim()).filter(Boolean))];
    if (unique.length === 0)
        throw new Error("sessionNames 不得为空");
    if (unique.length > 100)
        throw new Error("sessionNames 一次最多查询 100 个会话");
    return {
        targets: unique,
        eligible: unique.length,
        inactiveExcluded: 0,
        unknownLastUpdated: 0,
        truncated: false,
    };
}
function cleanMessage(message) {
    const sender = message?.sender && typeof message.sender === "object"
        ? message.sender.name ?? message.sender.nickname ?? message.sender.id
        : message?.sender ?? message?.sender_name ?? message?.from;
    const values = {
        time: message?.time ?? message?.timestamp,
        sender,
        content: message?.content ?? message?.text,
        type: message?.type,
        isSelf: message?.isSelf ?? message?.is_self,
        isTimeMessage: message?.isTimeMessage ?? message?.is_time_message,
    };
    return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}
/**
 * Read a bounded incremental window across chats in one tool call. Selection is fair across active
 * sessions: when the global cap is hit, the newest item from each session is retained round-robin.
 */
export async function readSessionMessagesBatch(reader, args) {
    const since = String(args.since || "").trim();
    if (!since)
        throw new Error("since 是必填的本地时间下界，不能全量读取聊天历史");
    const sinceEpochMs = parseSinceToEpochMs(since);
    const limitPerSession = positiveInteger(args.limitPerSession, 50, 200, "limitPerSession");
    const maxTotalMessages = positiveInteger(args.maxTotalMessages, 120, 500, "maxTotalMessages");
    const projection = args.projection ?? "clean_fields";
    if (projection !== "clean_fields" && projection !== "full") {
        throw new Error("projection 仅支持 clean_fields 或 full");
    }
    const wechatId = await reader.resolveWeChatId(args.wechatId);
    const index = await reader.listSessions(wechatId);
    const selection = requestedSessions(index, sinceEpochMs, args.sessionNames);
    const targets = selection.targets;
    const rows = [];
    for (const requestedName of targets) {
        rows.push({
            requestedName,
            result: await reader.getSessionMessages(wechatId, requestedName, { since, limit: limitPerSession }),
        });
    }
    // A non-covered range is not usable evidence. Do not even expose its saved messages in the
    // batch result, otherwise an Agent may treat old-but-nonempty data as current content.
    const messageRows = rows.map(row => row.result.coverage === "range_not_covered"
        ? []
        : (Array.isArray(row.result.messages) ? row.result.messages : []));
    const selected = messageRows.map(() => []);
    let selectedCount = 0;
    for (let depth = 1; selectedCount < maxTotalMessages; depth += 1) {
        let foundAtDepth = false;
        for (let i = 0; i < messageRows.length && selectedCount < maxTotalMessages; i += 1) {
            const source = messageRows[i];
            const message = source[source.length - depth];
            if (message === undefined)
                continue;
            foundAtDepth = true;
            selected[i].push(message);
            selectedCount += 1;
        }
        if (!foundAtDepth)
            break;
    }
    selected.forEach(messages => messages.reverse());
    const matchedMessages = rows.reduce((sum, row) => sum + (row.result.coverage === "range_not_covered"
        ? 0
        : Number(row.result.matchedInRange ?? row.result.returned ?? 0)), 0);
    const discardedMessagesForCoverage = rows.reduce((sum, row) => sum + (row.result.coverage === "range_not_covered"
        ? Number(row.result.matchedInRange ?? row.result.returned ?? 0)
        : 0), 0);
    const notFound = rows.filter(row => !row.result.found).map(row => row.requestedName);
    const coverageIssues = rows
        .filter(row => row.result.found && row.result.coverage === "range_not_covered")
        .map(row => ({
        sessionName: row.result.sessionName || row.requestedName,
        lastUpdated: row.result.lastUpdated,
    }));
    const sessions = rows.flatMap((row, index) => selected[index].length > 0 ? [{
            sessionName: row.result.sessionName || row.requestedName,
            isGroup: row.result.isGroup,
            lastUpdated: row.result.lastUpdated,
            matchedInRange: row.result.matchedInRange ?? row.result.returned ?? 0,
            returned: selected[index].length,
            messages: projection === "clean_fields" ? selected[index].map(cleanMessage) : selected[index],
        }] : []);
    return {
        wechatId,
        since,
        projection,
        sessionsScanned: rows.length,
        sessionsAvailable: index.length,
        sessionsEligible: selection.eligible,
        inactiveSessionsExcluded: selection.inactiveExcluded,
        unknownLastUpdatedSessions: selection.unknownLastUpdated,
        sessionSelectionTruncated: selection.truncated,
        ...(selection.truncated ? {
            sessionSelectionNotice: `活跃或更新时间未知的会话超过 ${AUTO_DISCOVERY_MAX_SESSIONS} 个，结果未覆盖全部候选会话；不得据此声称全量无新增。`,
        } : {}),
        sessionsWithMessages: sessions.length,
        matchedMessages,
        discardedMessagesForCoverage,
        returnedMessages: selectedCount,
        truncated: matchedMessages > selectedCount,
        noMessagesInRange: rows.filter(row => row.result.coverage === "no_messages_in_range").length,
        coverageIssues,
        ...(coverageIssues.length > 0 ? {
            coverageIssueNotice: "这些会话的本地历史未覆盖 since 区间，消息已从结果中剔除；不要用更早消息代替，也不要猜测缺失原因。",
        } : {}),
        notFound,
        sessions,
    };
}
