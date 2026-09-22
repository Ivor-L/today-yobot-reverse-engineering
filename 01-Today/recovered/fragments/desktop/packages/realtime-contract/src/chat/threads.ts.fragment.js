// Compiled fragment from ../../packages/realtime-contract/src/chat/threads.ts.
// The original TypeScript and import graph are not restored.

/**
 * Wire schemas for the read-cursor endpoints.
 *
 * `PUT /v1/read-position` and `GET /v1/unread-status` are not yet exposed
 * via the merged OpenAPI document; we type them by hand until they land
 * in the gateway's `/doc`.
 *
 * Single-timeline rewrite (PR-2): the per-thread schemas
 * (`threadDtoSchema`, `listThreadsQuerySchema`, `listThreadsResponseSchema`)
 * are gone — chat-v2 no longer renders a thread sidebar nor calls
 * `GET /agent/threads` (matches macOS, which has no thread list either).
 */ 
// ---------- Read position / unread status ----------
/**
 * Body of `PUT /v1/read-position`.
 *
 * Source: `services/agent-service/src/routes/read-cursor.ts:11-31`. The
 * backend derives `conversationId` from `X-User-Id` and ignores any
 * client-supplied threadId; the wire format is just the two fields below.
 */ const updateReadPositionRequestSchema = schemas_object({
    messageId: schemas_string().min(1),
    messageCreatedAt: schemas_string().min(1)
});
/**
 * Response of `GET /v1/unread-status`.
 *
 * Source: `services/agent-service/src/routes/read-cursor.ts:38-49`. The
 * backend returns `{ hasUnread, unreadCount }`; everything else is reserved
 * for future expansion (e.g. `latestMessageId`, `threadId`) and is allowed
 * to flow through via `.passthrough()` without forcing presence.
 */ const unreadStatusResponseSchema = schemas_object({
    hasUnread: schemas_boolean(),
    unreadCount: schemas_number().int().nonnegative()
}).passthrough();
