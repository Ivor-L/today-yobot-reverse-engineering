// Compiled fragment from ../../packages/realtime-contract/src/chat/events.ts.
// The original TypeScript and import graph are not restored.

/**
 * Wire schemas for chat realtime events delivered through Cloud WebSocket
 * `event.push`.
 *
 * Source-of-truth files in today-cloud:
 *
 * - today-cloud realtime envelope writer (legacy route module; injected
 *   `threadId` for thread.* and `taskId` for task.*)
 * - `services/agent-service/src/threads/types.ts:200-208` (ThreadEventType union)
 * - `services/agent-service/src/threads/run.ts:754-759, 1376-1382, 1559-1561,
 *   1670-1680` (thread.started, thread.completed, thread.failed, thread.token)
 * - `services/agent-service/src/threads/interruption.ts:42-50` (thread.failed
 *   via interruption)
 * - `services/agent-service/src/threads/delivery.ts:362-394` (message.new,
 *   chat.message_ready assistant)
 * - `services/agent-service/src/messages/command-service.ts:268-286`
 *   (chat.message_ready user)
 * - `services/agent-service/src/tasks/types.ts:425-440` (TaskEventType union)
 *
 * Design principles:
 * - Each event has its own zod schema. The wire-level discriminated union
 *   lives at `chatEventSchema`, matched on the Cloud event name.
 * - `keepalive` short-circuits before JSON.parse — handled by `parseEventStreamFrame`,
 *   not by a zod schema.
 * - Unknown event names are dropped with `parseEventStreamFrame` returning a
 *   `{ kind: 'unknown' }` discriminant; consumers log and skip.
 * - Every payload uses `.passthrough()` so backend additions do not crash.
 */ 


// ---------- Common ----------
const channelFieldsSchema = schemas_object({
    channel: schemas_string().optional(),
    channelContext: schemas_record(schemas_string(), unknown()).optional()
});
// ---------- Thread events ----------
/**
 * Reserved at `services/agent-service/src/threads/types.ts:201` but no emitter
 * exists today. Schema accepts arbitrary shape so a future emit does not
 * crash the consumer.
 */ const threadCreatedDataSchema = schemas_object({
    threadId: schemas_string().min(1)
}).passthrough();
/** Source: `run.ts:754-759`. */ const threadStartedDataSchema = channelFieldsSchema.extend({
    threadId: schemas_string().min(1),
    input: schemas_string()
}).passthrough();
/**
 * Per-token streaming delta for the active assistant message.
 * Source: `run.ts:1670-1680`.
 *
 * `channel` remains permissive because this package validates transport frames
 * for clients across versions; application-level routing is outside this schema.
 */ const threadTokenDataSchema = schemas_object({
    threadId: schemas_string().min(1),
    messageId: schemas_string().min(1),
    delta: schemas_string(),
    channel: schemas_string().optional()
}).passthrough();
/**
 * Tool lifecycle and attachment progress signals.
 *
 * `type` values observed in source:
 * - `'tool.start'` / `'tool.end'` — `services/agent-service/src/threads/run.test.ts:2099, 2118`
 * - `'message.attachments'` — appears alongside `outputFiles`
 *
 * Schema is permissive: any `type` string and any extra keys are accepted.
 */ const threadProgressDataSchema = channelFieldsSchema.extend({
    threadId: schemas_string().min(1),
    type: schemas_string().min(1)
}).passthrough();
/**
 * Source: `run.ts:1376-1382`. Both `response` and `expectedDeliveryCount` are
 * always emitted today; `trace` is conditionally present. Schemas reflect the
 * actual emitter contract so consumers do not have to guard against `undefined`
 * for fields that are guaranteed to exist.
 */ const threadCompletedDataSchema = channelFieldsSchema.extend({
    threadId: schemas_string().min(1),
    trace: schemas_record(schemas_string(), unknown()).optional(),
    response: schemas_string().nullable(),
    expectedDeliveryCount: schemas_number().int().nonnegative()
}).passthrough();
/**
 * Source: `run.ts:1559-1561`, `interruption.ts:42-50`. `failureType` is always
 * supplied at both emit sites.
 */ const threadFailedDataSchema = channelFieldsSchema.extend({
    threadId: schemas_string().min(1),
    error: schemas_string(),
    failureType: schemas_string().min(1)
}).passthrough();
// ---------- Message events ----------
/** Source: `delivery.ts:362-372`. Only emitted for assistant role today. */ const messageNewDataSchema = schemas_object({
    threadId: schemas_string().min(1),
    role: literal('assistant'),
    content: schemas_string(),
    channel: schemas_string(),
    messageId: schemas_string().min(1).optional(),
    outputFiles: schemas_array(fileAttachmentSchema).optional(),
    originClientMessageId: schemas_string().nullish(),
    originClientMessageIds: schemas_array(schemas_string()).nullish()
}).passthrough();
/**
 * Lightweight signal that a persisted message is ready. `replyTo` IS carried
 * inline (the macOS `ChatMessageReadyDTO` declares it — a live reply renders
 * its quote header with no refetch). Attachments are NOT: consumers fetch the
 * enriched body via `GET /v2/messages?after=cursor` when `attachments.files`
 * (or assistant intermediates) are needed — `hasAttachments=true` is the
 * trigger.
 *
 * Sources:
 * - assistant: `delivery.ts:380-394`
 * - user echo: `command-service.ts:268-286`
 *
 * The user-role variant carries `clientMessageId`; assistant variants may carry
 * `originClientMessageId` / `originClientMessageIds` to identify the user turn
 * that produced the response. `replyTo` is present only when the message is a
 * reply. Both variants share the rest of the shape.
 */ const chatMessageReadyDataSchema = schemas_object({
    id: schemas_string().min(1),
    threadId: schemas_string().min(1),
    role: schemas_enum([
        'user',
        'assistant'
    ]),
    content: schemas_string(),
    messageType: schemas_string().min(1),
    channel: schemas_string(),
    isFinal: schemas_boolean(),
    createdAt: schemas_string().min(1),
    cursor: schemas_string().min(1),
    hasAttachments: schemas_boolean(),
    clientMessageId: schemas_string().optional(),
    originClientMessageId: schemas_string().nullish(),
    originClientMessageIds: schemas_array(schemas_string()).nullish(),
    originTriggerType: schemas_string().optional(),
    replyTo: inboundReplySnapshotSchema.optional()
}).passthrough();
/**
 * Append-only link-preview delivery for an existing message. Mirrors the macOS
 * `ChatMessageUpdatedDTO` (`ChatAPIModels.swift:388-393`) one-for-one: the
 * outer envelope carries only the server `messageId` and an optional
 * `linkPreviewsAppend: LinkPreviewInfo[]`. The field name itself encodes the
 * contract — entries are additive, never replacing.
 *
 * macOS handler reference: `ChatViewModel+Realtime.swift:98-145`
 * (`handleChatMessageUpdated`). Web's `realtime-dispatcher` mirrors the same merge
 * semantics: lookup by server `messageId`; out-of-order / not-found events are
 * dropped on the floor with a warning (no queue, no retry). The HTTP backfill
 * (re-`GET /v2/messages?after=cursor`) is the safety net for misses, since
 * the same `LinkPreview` DTO rides on `attachments.linkPreviews` there too.
 */ const chatMessageUpdatedDataSchema = schemas_object({
    messageId: schemas_string().min(1),
    linkPreviewsAppend: schemas_array(linkPreviewSchema).optional()
}).passthrough();
/** Compatibility parser for older event producers; no application runtime consumes this shape. */ const legacyChatMessageReadyV2DataSchema = schemas_object({
    id: schemas_string().min(1),
    threadId: schemas_string().min(1),
    role: schemas_enum([
        'user',
        'assistant'
    ]),
    channel: schemas_string(),
    isFinal: schemas_boolean(),
    createdAt: schemas_string().min(1),
    cursor: schemas_string().min(1),
    hasAttachments: schemas_boolean().optional(),
    needPull: schemas_boolean().optional(),
    state: schemas_string().optional(),
    messages: schemas_array(messagePartSchema).default([]),
    clientMessageId: schemas_string().optional(),
    originClientMessageId: schemas_string().nullish(),
    originClientMessageIds: schemas_array(schemas_string()).nullish(),
    originTriggerType: schemas_string().optional(),
    replyTo: typedMessageV2ReplyToSchema.optional()
}).passthrough();
const canonicalMessageSnapshotSchema = schemas_object({
    id: schemas_string().min(1),
    conversationId: schemas_string().min(1),
    threadId: schemas_string().min(1),
    cursor: schemas_string().min(1),
    role: schemas_enum([
        'user',
        'assistant',
        'system'
    ]),
    state: schemas_enum([
        'in_progress',
        'completed',
        'interrupted'
    ]),
    isFinal: schemas_boolean(),
    createdAt: schemas_string().min(1),
    updatedAt: schemas_string().min(1),
    body: schemas_object({
        parts: schemas_array(messagePartSchema)
    }).passthrough()
}).passthrough();
const chatPresentationTypingSchema = schemas_object({
    speechId: schemas_string().min(1),
    startedAt: schemas_string().datetime({
        offset: true
    }),
    expiresAt: schemas_string().datetime({
        offset: true
    })
}).strict().refine((typing)=>Date.parse(typing.expiresAt) > Date.parse(typing.startedAt), {
    message: 'typing must expire after it starts'
});
const chatPresentationSnapshotSchema = schemas_object({
    revision: schemas_string().regex(/^(0|[1-9][0-9]*)$/),
    typing: chatPresentationTypingSchema.nullable()
}).strict();
const chatPresentationUpdatedDataSchema = schemas_object({
    messageProtocolVersion: literal('canonical-v1'),
    conversationId: schemas_string().min(1),
    presentation: chatPresentationSnapshotSchema
}).strict();
const canonicalMessageReadyV2DataSchema = schemas_object({
    messageProtocolVersion: literal('canonical-v1'),
    conversationId: schemas_string().min(1),
    message: canonicalMessageSnapshotSchema,
    needPull: schemas_boolean(),
    presentation: chatPresentationSnapshotSchema.optional()
}).passthrough().superRefine((data, context)=>{
    if (data.conversationId === data.message.conversationId) return;
    context.addIssue({
        code: 'custom',
        path: [
            'message',
            'conversationId'
        ],
        message: 'Canonical Message conversationId must match the event conversationId'
    });
});
const chatMessageReadyV2DataSchema = schemas_union([
    canonicalMessageReadyV2DataSchema,
    legacyChatMessageReadyV2DataSchema
]);
/**
 * v2 envelope for the assistant's in-progress / lifecycle-flip update.
 * Distinct from v1's `chat.message_updated` (which only appended link
 * previews): v2 ferries the full current `messages[]` snapshot, plus
 * `state` (`'in_progress' | 'completed' | 'interrupted'`) and `needPull`
 * (the consumer should refetch via REST when the snapshot is partial).
 *
 * Retained only as a transport compatibility parser. Canonical Chat consumes
 * the canonical snapshot events instead of this DTO.
 */ const legacyChatMessageUpdatedV2DataSchema = schemas_object({
    messageId: schemas_string().min(1),
    threadId: schemas_string().min(1).optional(),
    isFinal: schemas_boolean().optional(),
    needPull: schemas_boolean().optional(),
    state: schemas_string().optional(),
    messages: schemas_array(messagePartSchema).optional()
}).passthrough();
const canonicalMessageUpdatedV2DataSchema = schemas_object({
    messageProtocolVersion: literal('canonical-v1'),
    conversationId: schemas_string().min(1),
    messageId: schemas_string().min(1),
    message: canonicalMessageSnapshotSchema,
    needPull: schemas_boolean(),
    presentation: chatPresentationSnapshotSchema.optional()
}).passthrough().superRefine((data, context)=>{
    if (data.conversationId !== data.message.conversationId) {
        context.addIssue({
            code: 'custom',
            path: [
                'message',
                'conversationId'
            ],
            message: 'Canonical Message conversationId must match the event conversationId'
        });
    }
    if (data.messageId !== data.message.id) {
        context.addIssue({
            code: 'custom',
            path: [
                'messageId'
            ],
            message: 'Canonical Message id must match the event messageId'
        });
    }
});
const chatMessageUpdatedV2DataSchema = schemas_union([
    canonicalMessageUpdatedV2DataSchema,
    legacyChatMessageUpdatedV2DataSchema
]);
// ---------- Task events ----------
/**
 * Task event payloads vary by `taskType` and runner. The wire format is not
 * formally typed at the boundary (see `events.ts:103-108`), so the schema
 * accepts any shape with the writer-injected `taskId`. Consumers pattern-match
 * on the realtime event name and fall back to ignoring unknown fields.
 *
 * Source: `services/agent-service/src/tasks/types.ts:425-440` for the union of
 * task event names; payloads originate from individual runners (e.g.
 * `tasks/worker/runners/today-page-task-runner.ts:106` for `task.output.ready`).
 */ const taskEventDataSchema = schemas_object({
    taskId: schemas_string().min(1)
}).passthrough();
// ---------- Today Page V2 invalidation events ----------
/**
 * No-payload invalidation signal from today-cloud. The event means a new
 * Today Page V2 batch was committed and clients should refetch latest batches.
 */ const todayPageV2BatchReadyDataSchema = schemas_object({}).passthrough();
// ---------- Discriminated union ----------
/**
 * The full set of chat event names the shared transport understands. A frame whose `event` is
 * not in this set is treated as `unknown` by `parseEventStreamFrame` and dropped at
 * the runtime layer (logged, never thrown).
 */ const KNOWN_EVENT_NAMES = [
    'thread.created',
    'thread.started',
    'thread.progress',
    'thread.token',
    'thread.completed',
    'thread.failed',
    'message.new',
    'chat.message_ready',
    'chat.message_updated',
    'chat.message_ready.v2',
    'chat.message_updated.v2',
    'chat.presentation.updated.v1',
    'task.created',
    'task.started',
    'task.plan.created',
    'task.step.started',
    'task.step.progress',
    'task.step.completed',
    'task.step.failed',
    'task.completed',
    'task.failed',
    'task.stopped',
    'task.output.ready',
    TODAY_PAGE_V2_BATCH_READY_PUSH_EVENT,
    'keepalive'
];
const KNOWN_EVENT_NAME_SET = new Set(KNOWN_EVENT_NAMES);
function isKnownEventName(name) {
    return KNOWN_EVENT_NAME_SET.has(name);
}
/**
 * Discriminated union over the Cloud event name. The discriminator lives in the
 * outer delivery envelope, so parsers project it onto a synthetic `event` key
 * before zod validation.
 */ const chatEventSchema = discriminatedUnion('event', [
    schemas_object({
        event: literal('thread.created'),
        data: threadCreatedDataSchema
    }),
    schemas_object({
        event: literal('thread.started'),
        data: threadStartedDataSchema
    }),
    schemas_object({
        event: literal('thread.progress'),
        data: threadProgressDataSchema
    }),
    schemas_object({
        event: literal('thread.token'),
        data: threadTokenDataSchema
    }),
    schemas_object({
        event: literal('thread.completed'),
        data: threadCompletedDataSchema
    }),
    schemas_object({
        event: literal('thread.failed'),
        data: threadFailedDataSchema
    }),
    schemas_object({
        event: literal('message.new'),
        data: messageNewDataSchema
    }),
    schemas_object({
        event: literal('chat.message_ready'),
        data: chatMessageReadyDataSchema
    }),
    schemas_object({
        event: literal('chat.message_updated'),
        data: chatMessageUpdatedDataSchema
    }),
    schemas_object({
        event: literal('chat.message_ready.v2'),
        data: chatMessageReadyV2DataSchema
    }),
    schemas_object({
        event: literal('chat.message_updated.v2'),
        data: chatMessageUpdatedV2DataSchema
    }),
    schemas_object({
        event: literal('chat.presentation.updated.v1'),
        data: chatPresentationUpdatedDataSchema
    }),
    schemas_object({
        event: literal('task.created'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.started'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.plan.created'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.step.started'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.step.progress'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.step.completed'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.step.failed'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.completed'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.failed'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.stopped'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal('task.output.ready'),
        data: taskEventDataSchema
    }),
    schemas_object({
        event: literal(TODAY_PAGE_V2_BATCH_READY_PUSH_EVENT),
        data: todayPageV2BatchReadyDataSchema
    }),
    schemas_object({
        event: literal('keepalive'),
        data: literal('')
    })
]);
// `replySnapshotSchema` is re-exported here so consumers can build enriched
// PublicMessage objects after a chat.message_ready prompts them to call
// `GET /v2/messages?after=cursor`. The realtime event itself never carries it.

function events_isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function events_stringValue(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function isThreadScopedEventName(eventName) {
    return eventName.startsWith('thread.') || eventName === 'message.new' || eventName.startsWith('chat.message_');
}
function rawDataPreview(value) {
    try {
        return JSON.stringify(value) ?? '';
    } catch  {
        return '[unserializable event.push payload]';
    }
}
function eventPushDataForProtocol(eventName, payload) {
    const innerData = events_isRecord(payload.data) ? payload.data : {};
    if (isThreadScopedEventName(eventName)) {
        return {
            ...events_stringValue(payload.threadId) ? {
                threadId: payload.threadId
            } : {},
            ...innerData
        };
    }
    if (eventName.startsWith('task.')) {
        return {
            ...events_stringValue(payload.taskId) ? {
                taskId: payload.taskId
            } : {},
            ...innerData
        };
    }
    return innerData;
}
function parseKnownEventData(eventName, parsed, rawData) {
    if (eventName === 'keepalive') {
        if (rawData === '') {
            return {
                kind: 'event',
                event: {
                    event: 'keepalive',
                    data: ''
                }
            };
        }
        return {
            kind: 'invalid',
            eventName,
            rawData,
            error: new SyntaxError('keepalive frame must have empty data')
        };
    }
    if (!isKnownEventName(eventName)) {
        return {
            kind: 'unknown',
            eventName,
            rawData
        };
    }
    const result = chatEventSchema.safeParse({
        event: eventName,
        data: parsed
    });
    if (!result.success) {
        return {
            kind: 'invalid',
            eventName,
            rawData,
            error: result.error
        };
    }
    return {
        kind: 'event',
        event: result.data
    };
}
/**
 * Parse a Cloud WebSocket `event.push.payload` into the typed chat event union.
 *
 * The relay wraps public event data as `{ event, threadId?, taskId?, data? }`.
 * This adapter normalizes that envelope so the chat runtime can keep a single
 * dispatcher for all chat protocol events.
 */ function parseEventPushPayload(payload) {
    const eventName = events_stringValue(payload.event);
    if (!eventName) {
        return {
            kind: 'unknown',
            eventName: '',
            rawData: rawDataPreview(payload)
        };
    }
    const parsed = eventPushDataForProtocol(eventName, payload);
    return parseKnownEventData(eventName, parsed, rawDataPreview(parsed));
}
/**
 * Parse a raw named event frame into a typed chat event.
 *
 * Behavior:
 * - `event === 'keepalive'`: short-circuit to `{ kind: 'event', event: { event: 'keepalive', data: '' } }`
 *   without touching JSON.parse.
 * - Unknown `event`: returns `{ kind: 'unknown', ... }`. The caller logs and skips.
 * - JSON syntax error or schema mismatch: returns `{ kind: 'invalid', ... }` with the underlying error.
 *   The caller logs and skips; chat-v2 never throws for malformed events.
 */ function parseEventStreamFrame(input) {
    const eventName = input.event;
    if (eventName === 'keepalive') {
        return parseKnownEventData(eventName, '', input.data);
    }
    if (!isKnownEventName(eventName)) {
        return {
            kind: 'unknown',
            eventName,
            rawData: input.data
        };
    }
    let parsed;
    try {
        parsed = JSON.parse(input.data);
    } catch (err) {
        return {
            kind: 'invalid',
            eventName,
            rawData: input.data,
            error: err instanceof SyntaxError ? err : new SyntaxError(String(err))
        };
    }
    return parseKnownEventData(eventName, parsed, input.data);
}
