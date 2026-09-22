/**
 * UI-only messages are persisted so the user can review task/quota cards, but
 * they must never become LLM conversation history.
 *
 * `isolated` is the canonical marker. The legacy card markers remain here as
 * a defensive compatibility layer for records created before that marker was
 * introduced or accidentally written into the primary session file.
 */
export function isPresentationOnlyMessage(message) {
    const metadata = message?.metadata;
    if (!metadata || typeof metadata !== "object")
        return false;
    return metadata.isolated === true
        || metadata.cronRun != null
        || metadata.sessionQuota != null;
}
function isCurrentUserMessage(message, currentMessage) {
    if (message.role !== "user")
        return false;
    if (currentMessage.id && message.id === currentMessage.id)
        return true;
    const currentTurnId = currentMessage.metadata?.turnId;
    return currentTurnId != null
        && currentTurnId !== ""
        && message.metadata?.turnId === currentTurnId;
}
/** Build the exact gateway history that may be handed to the model. */
export function buildModelHistory(history, currentMessage, retry) {
    if (retry)
        return [];
    return (history || []).filter((message) => !isPresentationOnlyMessage(message)
        && !isCurrentUserMessage(message, currentMessage));
}
