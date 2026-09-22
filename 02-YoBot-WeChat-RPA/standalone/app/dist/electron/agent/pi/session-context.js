/**
 * Append-only session context (prompt-cache critical).
 *
 * Per-turn-volatile context (RAG memory + Session Ledger) must NOT be rewritten into the
 * system prompt every turn: that changes the cached prefix at the very front of the request
 * and busts the Anthropic prompt cache for the ENTIRE conversation history (server-side
 * cache_control lives in server/.../proxy/anthropic_handler.ts). Instead we append only the
 * DELTA (items never injected before this session) onto the user turn, embedding the injected
 * ids in an HTML comment so the next turn can de-duplicate by scanning history. This keeps
 * context append-only, so the cached prefix grows turn over turn — exactly how Claude Code /
 * Codex stay cache-friendly.
 *
 * These are pure functions (no I/O) so they can be unit-tested in isolation.
 */
/** customType of the injected-context message (pi custom message channel). */
export const SESSION_CONTEXT_CUSTOM_TYPE = "yoko-session-context";
/**
 * Runtime clock policy shared by the stable system prompt and append-only time snapshots.
 * Yoko's scheduler and `get_current_time` tool use the same zone.
 */
export const RUNTIME_TIME_ZONE = "Asia/Shanghai";
export const RUNTIME_TIME_ZONE_LABEL = "Asia/Shanghai (UTC+08:00)";
/**
 * Build the approximate local clock that used to live in the system prompt.
 *
 * Keeping the value hour-granular preserves the old time semantics, while placing the
 * rendered block in an append-only custom message prevents an hour change from rewriting
 * the request prefix. Exact-time work still belongs to `get_current_time`.
 */
export function createRuntimeTimeSnapshot(at = new Date()) {
    const date = at instanceof Date ? at : new Date(at);
    if (!Number.isFinite(date.getTime()))
        throw new RangeError("Invalid runtime time snapshot date");
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: RUNTIME_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "long",
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
    const year = part("year");
    const month = part("month");
    const day = part("day");
    const hour = part("hour");
    const weekday = part("weekday");
    if (!year || !month || !day || !hour || !weekday) {
        throw new Error("Unable to format runtime time snapshot");
    }
    const localDate = `${year}-${month}-${day}`;
    return {
        bucket: `${RUNTIME_TIME_ZONE}|${localDate}T${hour}`,
        date: localDate,
        weekday,
        hour,
    };
}
/** Render one append-only clock update. The latest visible block always wins. */
export function buildRuntimeTimeContextBlock(snapshot) {
    return [
        "<runtime_time>",
        `Current local time: ${snapshot.date} (${snapshot.weekday}), ${snapshot.hour}:00-${snapshot.hour}:59, ${RUNTIME_TIME_ZONE_LABEL}.`,
        "This supersedes earlier <runtime_time> blocks. Call `get_current_time` when exact time is required.",
        "</runtime_time>",
    ].join("\n");
}
/**
 * Legacy projection window. Stable projection passes `0` to scan the complete
 * canonical post-compaction history, so both projection and de-dup share Pi's
 * persisted compaction boundary instead of maintaining separate cut points.
 */
export const SEND_HISTORY_TURN_LIMIT = 30;
/** Stable de-dup key for a RAG fact (falls back to a text hash when it has no id). */
export function ragFactKey(f) {
    if (f.id)
        return f.id;
    let h = 5381;
    const s = (f.text || "").slice(0, 200);
    for (let i = 0; i < s.length; i++)
        h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return "t" + (h >>> 0).toString(36);
}
// Roles that count as ONE turn in the send-time window. convertToLlm maps
// custom/branchSummary/compactionSummary/bashExecution to user role, but the
// injected "custom" message is then MERGED into its adjacent real user message
// by validateAnthropicTurns BEFORE limitHistoryTurns counts turns — so a
// custom+user pair is a single counted turn at send time. Counting "custom"
// separately here would shrink the de-dup window to ~half the send window and
// re-inject facts the model can still see. Custom messages are still SCANNED
// for ids below; they just don't consume a turn slot.
function isUserEquivalentRole(role) {
    return role === "user" || role === "branchSummary"
        || role === "compactionSummary" || role === "bashExecution";
}
/**
 * Scan previously-injected context ids from prior messages.
 *
 * Sources (both supported for backward compatibility):
 * - custom messages (SESSION_CONTEXT_CUSTOM_TYPE) carrying ids in `details` — current format;
 * - legacy `yoko-ctx-ids` HTML comment embedded in user-message text — pre-migration sessions.
 *
 * `maxUserTurns > 0` mirrors the legacy send window. Pass 0 for stable projection:
 * the supplied history has already had all pre-boundary entries replaced by Pi's
 * persisted compaction summary, so scanning it fully cannot see removed entries.
 */
export function extractInjectedContextIds(messages, maxUserTurns = SEND_HISTORY_TURN_LIMIT) {
    const rag = new Set();
    const ledger = new Set();
    let latestRuntimeTimeBucket;
    if (!Array.isArray(messages))
        return { rag, ledger, latestRuntimeTimeBucket };
    let start = 0;
    if (maxUserTurns > 0) {
        let turns = 0;
        for (let i = messages.length - 1; i >= 0; i--) {
            if (isUserEquivalentRole(messages[i]?.role)) {
                turns++;
                if (turns > maxUserTurns) {
                    start = i + 1;
                    break;
                }
            }
        }
    }
    const re = /yoko-ctx-ids:\s*rag=([^;]*);ledger=([^>]*?)\s*-->/g;
    for (let i = start; i < messages.length; i++) {
        const m = messages[i];
        if (!m)
            continue;
        // Current format: structured ids on the injected custom message.
        if (m.role === "custom" && m.customType === SESSION_CONTEXT_CUSTOM_TYPE && m.details) {
            const d = m.details;
            if (Array.isArray(d.rag))
                for (const id of d.rag) {
                    if (typeof id === "string" && id)
                        rag.add(id);
                }
            if (Array.isArray(d.ledger))
                for (const id of d.ledger) {
                    if (typeof id === "string" && id)
                        ledger.add(id);
                }
            if (typeof d.runtimeTimeBucket === "string" && d.runtimeTimeBucket) {
                // Message order matters: a clock rollback must append a new snapshot even if
                // that bucket appeared earlier in history, so only the latest value de-dups.
                latestRuntimeTimeBucket = d.runtimeTimeBucket;
            }
            continue;
        }
        // Legacy format: marker comment inside user-message text.
        if (m.role !== "user")
            continue;
        const content = m.content;
        const text = typeof content === "string"
            ? content
            : Array.isArray(content)
                ? content.map((c) => (c && typeof c.text === "string" ? c.text : "")).join(" ")
                : "";
        if (!text || text.indexOf("yoko-ctx-ids:") === -1)
            continue;
        re.lastIndex = 0;
        let match;
        while ((match = re.exec(text)) !== null) {
            for (const id of match[1].split(",")) {
                const t = id.trim();
                if (t)
                    rag.add(t);
            }
            for (const id of match[2].split(",")) {
                const t = id.trim();
                if (t)
                    ledger.add(t);
            }
        }
    }
    return { rag, ledger, latestRuntimeTimeBucket };
}
/**
 * Build the <session_context> block (or "" if no delta).
 *
 * `includeIdMarker` embeds the legacy `yoko-ctx-ids` HTML comment for text-based
 * de-dup. The custom-message channel carries ids in `details` instead, so it
 * passes false to avoid sending a redundant marker to the LLM.
 */
export function buildSessionContextBlock(ragFacts, ledgerItems, includeIdMarker = true) {
    const hasRag = ragFacts && ragFacts.length > 0;
    const hasLedger = ledgerItems && ledgerItems.length > 0;
    if (!hasRag && !hasLedger)
        return "";
    const lines = [
        "<session_context>",
        "(Background context retrieved for this conversation. The current request takes priority; use this only if relevant, and don't mention it unless asked.)",
    ];
    if (hasRag) {
        lines.push("Relevant memory:");
        ragFacts.forEach((f, i) => {
            const src = f.source === "file" ? `File: ${f.path}` : "Chat History";
            lines.push(`${i + 1}. ${f.text} (Source: ${src})`);
        });
    }
    if (hasLedger) {
        lines.push("Session notes (corrections / decisions to honor):");
        for (const item of ledgerItems)
            lines.push(`- ${item.text}`);
    }
    if (includeIdMarker) {
        const ragIds = ragFacts.map((f) => f.key).filter(Boolean).join(",");
        const ledgerIds = ledgerItems.map((i) => i.id).join(",");
        lines.push(`<!-- yoko-ctx-ids: rag=${ragIds};ledger=${ledgerIds} -->`);
    }
    lines.push("</session_context>");
    return "\n\n" + lines.join("\n");
}
