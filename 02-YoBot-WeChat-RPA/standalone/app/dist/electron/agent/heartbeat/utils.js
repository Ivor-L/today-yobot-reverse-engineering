import { HEARTBEAT_PROMPT } from "./constants.js";
export function isHeartbeatContentEffectivelyEmpty(content) {
    if (content === undefined || content === null) {
        return true; // Treat missing as empty to save tokens
    }
    if (typeof content !== "string") {
        return true;
    }
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        // Skip markdown header lines (# followed by space or EOL, ## etc)
        if (/^#+(\s|$)/.test(trimmed))
            continue;
        // Skip empty markdown list items like "- [ ]" or "* [ ]" or just "- "
        if (/^[-*+]\s*(\[[\sXx]?\]\s*)?$/.test(trimmed))
            continue;
        // Found a non-empty, non-comment line - there's actionable content
        return false;
    }
    return true;
}
export function resolveHeartbeatPrompt(raw) {
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    return trimmed || HEARTBEAT_PROMPT;
}
