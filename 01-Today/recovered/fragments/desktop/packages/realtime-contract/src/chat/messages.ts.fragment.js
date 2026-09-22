// Compiled fragment from ../../packages/realtime-contract/src/chat/messages.ts.
// The original TypeScript and import graph are not restored.

/**
 * Wire schemas for chat messages.
 *
 * The shapes here are the single source of truth for what flows over
 * `POST /v1/messages`, `GET /v2/messages`, and Cloud WebSocket message
 * events. They have been cross-checked against the today-cloud HEAD source:
 *
 * - `services/agent-service/src/routes/message.ts` (request body)
 * - `services/backend-service/src/routes/messages.ts` (response, PublicMessage)
 *
 * Every response schema uses `.passthrough()` so a backend-only field
 * addition does not break the client at runtime.
 */ 

// ---------- Attachments ----------
/**
 * Categorical attachment kind, mirrored 1:1 from
 * `services/agent-service/src/threads/types.ts:17` (today-cloud).
 *
 * `image` covers anything `image/*`; `text` is a plain-text document; `pdf`
 * is `application/pdf`; `voice` is the Ogg/Opus chat voice-message protocol;
 * `file` is the catch-all bucket. The classification is performed by
 * `POST /v1/files` (see `ALLOWED_MIME_TYPES` / `VOICE_PURPOSE` in
 * `services/backend-service/src/routes/files.ts`); the client receives the
 * resolved `type` in the upload response and forwards it as-is on send.
 */ const attachmentTypeSchema = schemas_enum([
    'image',
    'text',
    'pdf',
    'file',
    'voice'
]);
/** Public committed-file identity. Storage namespace/path/digest remain server-only. */ const storageFileRefSchema = schemas_object({
    fileId: schemas_string().min(1),
    versionId: schemas_string().min(1)
})// 滚动升级期间接受旧响应，但解析结果只保留 Public 两字段。
.strip();
const voiceTranscriptionSchema = schemas_object({
    status: schemas_enum([
        'pending',
        'processing',
        'completed',
        'failed'
    ]),
    transcript: schemas_string(),
    languageCode: schemas_string(),
    provider: schemas_string(),
    transcribedAtMs: schemas_number(),
    failureReason: schemas_string().optional()
}).passthrough();
const voiceAttachmentMetadataSchema = schemas_object({
    durationMs: schemas_number().int().nonnegative(),
    container: literal('ogg'),
    audioCodec: literal('opus'),
    sampleRate: schemas_number().int().positive(),
    channels: schemas_number().int().positive(),
    voiceStreamId: schemas_string().optional(),
    waveform: schemas_array(schemas_number().min(0).max(1)).optional(),
    transcription: voiceTranscriptionSchema.optional()
}).passthrough();
/**
 * Outgoing attachment reference attached to a `SendMessageRequest`.
 *
 * **Source-of-truth**: `services/agent-service/src/threads/types.ts:17-27`
 * (`AttachmentRef`). The wire shape MUST match the canonical backend type;
 * the previous web schema used `{ fileId, filename, mimeType, size }`,
 * which the backend transparently forwards into thread / message storage
 * but cannot enrich into a download URL on read because
 * `query-service.toFileAttachmentInfo` requires `storagePath`. Sending the
 * minimal `fileId` shape produced messages whose attachments could not be
 * rendered cross-client (web list enrich crashed; macOS / iOS could not
 * resolve a download URL).
 *
 * Required fields: `type`, `storagePath`, `filename`, `mimeType`, `size`.
 * `id` and `width` / `height` are optional — `id` is the canonical UUID
 * extracted from `storagePath`; the latter two are populated by the upload
 * endpoint when the file is an image.
 */ const sendAttachmentRefSchema = schemas_object({
    id: schemas_string().min(1).optional(),
    type: attachmentTypeSchema,
    storagePath: schemas_string().min(1),
    filename: schemas_string().min(1),
    mimeType: schemas_string().min(1),
    size: schemas_number().int().nonnegative(),
    width: schemas_number().int().nonnegative().optional(),
    height: schemas_number().int().nonnegative().optional(),
    voice: voiceAttachmentMetadataSchema.optional()
});
/**
 * Wire format of `POST /v1/files` (HTTP 201). Source-of-truth:
 * `services/backend-service/src/routes/files.ts:300-310`.
 */ const uploadFileResponseSchema = schemas_object({
    file: schemas_object({
        id: schemas_string().min(1),
        url: schemas_string().min(1),
        fileRef: storageFileRefSchema.optional(),
        path: schemas_string().min(1).optional(),
        storagePath: schemas_string().min(1).optional(),
        downloadUrl: schemas_string().min(1).optional(),
        previewUrl: schemas_string().min(1).optional(),
        filename: schemas_string().min(1),
        mimeType: schemas_string().min(1),
        size: schemas_number().int().nonnegative(),
        type: attachmentTypeSchema,
        width: schemas_number().int().nonnegative().optional(),
        height: schemas_number().int().nonnegative().optional(),
        voice: voiceAttachmentMetadataSchema.optional(),
        source: schemas_string().optional()
    }).superRefine((file, context)=>{
        const { fileRef } = file;
        if (!file.path && !file.storagePath && !fileRef) {
            context.addIssue({
                code: 'custom',
                path: [
                    'path'
                ],
                message: 'upload response requires a Legacy path or Storage FileRef'
            });
        }
        if (!fileRef) return;
        if (file.id !== fileRef.fileId) {
            context.addIssue({
                code: 'custom',
                path: [
                    'id'
                ],
                message: 'id must match fileRef.fileId'
            });
        }
        // 共享上传解析仍需兼容 Legacy owner 的旧响应；Canonical 发送层会单独拒绝
        // storage:// 和缺少 HTTP access URL 的附件，避免影响尚未灰度的旧 Chat。
        if (!file.url.startsWith('storage://user/') && !/^https?:\/\//iu.test(file.url)) {
            context.addIssue({
                code: 'custom',
                path: [
                    'url'
                ],
                message: 'Storage-backed upload URL must use http(s) or storage://user/'
            });
        }
        if (file.downloadUrl !== undefined && !file.downloadUrl.startsWith('storage://user/') && !/^https?:\/\//iu.test(file.downloadUrl)) {
            context.addIssue({
                code: 'custom',
                path: [
                    'downloadUrl'
                ],
                message: 'Storage-backed downloadUrl must use http(s) or storage://user/'
            });
        }
    })
});
/**
 * Map a `POST /v1/files` 201 response into a `SendAttachmentRef`. Useful at
 * upload-completion time so the composer holds an immediately-sendable ref.
 */ function uploadResponseToAttachmentRef(response) {
    const { file } = response;
    // Canonical upload不再暴露Storage path；HTTP fallback只维持Composer统一展示结构，
    // Legacy owner仍应由服务端返回path/storagePath供Legacy消息发送。
    const storagePath = file.storagePath ?? file.path ?? file.downloadUrl ?? file.url;
    if (!storagePath) {
        throw new Error('Upload response has no attachment path');
    }
    return {
        id: file.id,
        type: file.type,
        storagePath,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        ...file.width !== undefined ? {
            width: file.width
        } : {},
        ...file.height !== undefined ? {
            height: file.height
        } : {},
        ...file.voice ? {
            voice: file.voice
        } : {}
    };
}
/**
 * Outbound attachment as exposed on `PublicMessage.attachments.files`.
 *
 * `downloadUrl` is already absolutized by `backend-service/src/routes/messages.ts`
 * before the response leaves the gateway.
 */ const fileAttachmentSchema = schemas_object({
    id: schemas_string().min(1),
    filename: schemas_string(),
    title: schemas_string().optional(),
    summary: schemas_string().optional(),
    mimeType: schemas_string(),
    size: schemas_number().int().nonnegative(),
    storagePath: schemas_string().min(1).optional(),
    previewUrl: schemas_string().min(1).optional(),
    downloadUrl: schemas_string().min(1),
    type: attachmentTypeSchema.optional(),
    width: schemas_number().int().nonnegative().optional(),
    height: schemas_number().int().nonnegative().optional(),
    voice: voiceAttachmentMetadataSchema.optional()
}).passthrough();
/**
 * Outbound link-preview attachment on `PublicMessage.attachments.linkPreviews`
 * AND on the realtime `chat.message_updated.linkPreviewsAppend` payload — one DTO,
 * two transports. Mirrors macOS `LinkPreviewInfo` (`ChatAPIModels.swift:255-271`)
 * exactly so the parity bar stays declarative.
 *
 * `url` and `kind` are the only required fields. `fields` carries kind-specific
 * structured rows (e.g. price + label for a stock-card kind); chat-v2 parses
 * them so the schema stays forward-compatible, but the renderer currently
 * hides them — matches macOS, where `ChatLinkPreviewView` builds field views
 * then sets `isHidden = true` in both card layouts.
 *
 * `status` is optional on the wire; consumers treat the absence as `"ready"`
 * (matches `ChatModels.swift:228`).
 */ const linkPreviewFieldInfoSchema = schemas_object({
    label: schemas_string(),
    value: schemas_string(),
    emphasis: schemas_boolean().optional()
}).passthrough();
/**
 * URL-scheme refinement applied to every URL field on a link preview.
 *
 * Trust-boundary fix (codex review): the preview's `url` (and any sibling
 * `canonicalUrl` / `imageDownloadUrl` / `faviconUrl`) flows into
 * `window.open` and `<img src>`. Without scheme validation, a malformed /
 * malicious upstream preview could ride a `javascript:` or `data:` URL
 * through to the browser. `noopener,noreferrer` blocks tabnabbing on a
 * cross-origin open but does NOT prevent `javascript:` execution, and
 * `<img src="data:...">` would render arbitrary content. Restrict to
 * `http:` / `https:` only at the schema boundary so EVERY downstream
 * consumer (renderer, persistence rehydrate, tests) sees clean URLs.
 * The bubble does a belt-and-suspenders check too (defense-in-depth).
 */ const HTTP_URL_REGEX = /^https?:\/\//i;
const httpUrlSchema = schemas_string().min(1).refine((v)=>HTTP_URL_REGEX.test(v), {
    message: 'must be an http(s) URL'
});
const linkPreviewSchema = schemas_object({
    url: httpUrlSchema,
    kind: schemas_string().min(1),
    title: schemas_string().optional(),
    description: schemas_string().optional(),
    siteName: schemas_string().optional(),
    imageDownloadUrl: httpUrlSchema.optional(),
    imageWidth: schemas_number().int().nonnegative().optional(),
    imageHeight: schemas_number().int().nonnegative().optional(),
    faviconUrl: httpUrlSchema.optional(),
    canonicalUrl: httpUrlSchema.optional(),
    fields: schemas_array(linkPreviewFieldInfoSchema).optional(),
    fetchedAt: schemas_string().optional(),
    status: schemas_string().optional()
}).passthrough();
/**
 * Client-synthesized composite merge key for link previews. Mirrors macOS
 * `ChatLinkPreview.id` (`ChatModels.swift:229`) — the server does NOT issue a
 * preview id, so dedupe across `chat.message_updated` events relies on this
 * `url|kind|title` composite. Strict equality on the three wire fields.
 */ function linkPreviewMergeKey(preview) {
    return `${preview.url}|${preview.kind}|${preview.title ?? ''}`;
}
// ---------- QA cards ----------
const qaCardMessageTypeSchema = schemas_enum([
    'qa_single_select',
    'qa_multi_select',
    'qa_connector_auth',
    'qa_multi_page',
    'qa_cardflow_single'
]);
const qaCardOptionSchema = schemas_object({
    id: schemas_string().min(1),
    label: schemas_string()
}).passthrough();
const qaCardflowSingleOptionSchema = schemas_object({
    id: schemas_string().min(1),
    label: schemas_string(),
    description: schemas_string().nullable(),
    icon: schemas_string().max(128).default(''),
    next_card_id: schemas_string().min(1).nullable(),
    content: schemas_string().min(1).nullable()
}).passthrough().refine((option)=>option.next_card_id === null !== (option.content === null), {
    message: 'next_card_id and content must have exactly one non-null value'
});
const qaCardflowSingleOthersFieldSchema = schemas_object({
    id: schemas_string().min(1),
    label: schemas_string(),
    content: schemas_string().min(1)
}).passthrough();
const qaCardflowSingleNodeSchema = schemas_object({
    card_id: schemas_string().min(1),
    parent_card_id: schemas_string().min(1).nullable(),
    prompt: schemas_string(),
    options: schemas_array(qaCardflowSingleOptionSchema),
    others_field: qaCardflowSingleOthersFieldSchema.nullable().optional()
}).passthrough();
const qaCardflowSingleBodySchema = schemas_object({
    entry_card_id: schemas_string().min(1),
    cards: schemas_array(qaCardflowSingleNodeSchema).min(1)
}).passthrough();
const qaCardflowSinglePathItemSchema = schemas_object({
    card_id: schemas_string().min(1),
    selected_option_id: schemas_string().min(1)
});
const qaCardOthersFieldSchema = schemas_object({
    id: schemas_string().min(1).optional(),
    label: schemas_string(),
    required: schemas_boolean().optional(),
    max_length: schemas_number().int().positive().optional(),
    placeholder: schemas_string().optional()
}).passthrough();
const qaCardLegacyBodySchema = schemas_object({
    prompt: schemas_string(),
    options: schemas_array(qaCardOptionSchema),
    others_field: qaCardOthersFieldSchema.optional(),
    selection_mode: schemas_string().optional(),
    type: schemas_string().optional()
}).passthrough();
const qaCardSelectPageSchema = schemas_object({
    id: schemas_string().min(1),
    type: literal('select'),
    multi_select: schemas_boolean(),
    prompt: schemas_string(),
    options: schemas_array(qaCardOptionSchema),
    others_field: qaCardOthersFieldSchema.optional()
}).passthrough();
const qaCardTimeFieldSchema = schemas_object({
    id: schemas_string().min(1),
    label: schemas_string(),
    default: schemas_string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()
}).passthrough();
const qaCardTimePageSchema = schemas_object({
    id: schemas_string().min(1),
    type: literal('time'),
    prompt: schemas_string(),
    subtitle: schemas_string().optional(),
    fields: schemas_array(qaCardTimeFieldSchema).min(1).max(4)
}).passthrough();
const qaCardPageSchema = discriminatedUnion('type', [
    qaCardSelectPageSchema,
    qaCardTimePageSchema
]);
const qaCardMultiPageBodySchema = schemas_object({
    pages: schemas_array(qaCardPageSchema).min(1).max(3)
}).passthrough();
const qaCardBodySchema = schemas_union([
    qaCardLegacyBodySchema,
    qaCardMultiPageBodySchema,
    qaCardflowSingleBodySchema
]);
const qaCardSelectPageAnswerSchema = schemas_object({
    page_id: schemas_string().min(1),
    selected_option_ids: schemas_array(schemas_string()),
    other_text: schemas_string().nullable().optional()
}).passthrough();
const qaCardTimePageAnswerSchema = schemas_object({
    page_id: schemas_string().min(1),
    field_values: schemas_record(schemas_string(), schemas_string())
}).passthrough();
const qaCardPageAnswerSchema = schemas_union([
    qaCardSelectPageAnswerSchema,
    qaCardTimePageAnswerSchema
]);
const qaCardResponseSchema = schemas_object({
    selected_option_ids: schemas_array(schemas_string()).optional(),
    other_text: schemas_string().nullable().optional(),
    responded_at: schemas_string().optional(),
    connector_authorized: schemas_boolean().optional(),
    expired_reason: schemas_string().optional(),
    answers: schemas_array(qaCardPageAnswerSchema).optional(),
    path: schemas_array(qaCardflowSinglePathItemSchema).optional()
}).passthrough();
const qaCardContentSchema = schemas_object({
    // Some card envelopes carry `card_id` only at the outer envelope level.
    card_id: schemas_string().min(1).optional(),
    body: qaCardBodySchema,
    status: schemas_string(),
    response: qaCardResponseSchema.nullable().optional(),
    created_at: schemas_string().optional(),
    expires_at: schemas_string().nullable().optional()
}).passthrough();
const qaCardEnvelopeSchema = schemas_object({
    card_id: schemas_string().min(1),
    message_type: qaCardMessageTypeSchema,
    content: qaCardContentSchema
}).passthrough();
const submitQACardContentSchema = schemas_object({
    card_id: schemas_string().min(1).optional(),
    body: qaCardBodySchema.optional(),
    status: schemas_string().optional(),
    response: qaCardResponseSchema.nullable().optional(),
    created_at: schemas_string().optional(),
    expires_at: schemas_string().nullable().optional()
}).passthrough();
const submitQACardResponseSchema = schemas_object({
    card_id: schemas_string().min(1),
    content: submitQACardContentSchema
}).passthrough();
// ---------- Message parts (v2) ----------
const normalizeBriefCardTargetType = (value)=>value === 'html_file' || value === 'link' ? value : 'unknown';
const normalizeBriefCardIcon = (value)=>value === 'brief_first' || value === 'brief_morning' || value === 'brief_evening' ? value : 'unknown';
/**
 * Daily-brief card payload based on the generated OpenAPI contract.
 *
 * Native clients already accept `description` and `storagePath`, while the
 * generated schema has not caught up yet. Enum and metadata fields are also
 * decoded permissively: an additive server value must not hide an otherwise
 * renderable card. Unknown targets open as normal links and unknown icons
 * reserve the native-compatible empty artwork slot.
 */ const briefCardContentSchema = zMessageBriefCardContent.extend({
    targetType: schemas_string().min(1),
    icon: schemas_string().min(1),
    metadata: schemas_record(schemas_string(), unknown()).optional(),
    description: schemas_string().optional(),
    storagePath: schemas_string().optional()
}).passthrough().transform((card)=>({
        ...card,
        targetType: normalizeBriefCardTargetType(card.targetType),
        icon: normalizeBriefCardIcon(card.icon)
    }));
const automationCardContentSchema = schemas_object({
    ruleId: schemas_string().min(1),
    operation: schemas_enum([
        'create',
        'update'
    ]),
    name: schemas_string().min(1),
    iconName: schemas_string().nullable(),
    version: schemas_number().int().positive(),
    schedule: schemas_object({
        displayText: schemas_string().min(1)
    }).passthrough().nullable()
}).passthrough();
const messagePartSchema = schemas_object({
    messageType: schemas_string().min(1),
    content: unknown()
}).passthrough();
/**
 * Decode renderable brief cards without allowing one malformed future part
 * to invalidate its surrounding message.
 */ const briefCardsFromMessageParts = (parts)=>{
    const cards = [];
    for (const part of parts ?? []){
        if (part.messageType !== 'brief_card') continue;
        const parsed = briefCardContentSchema.safeParse(part.content);
        if (parsed.success) cards.push(parsed.data);
    }
    return cards;
};
/**
 * Decode v2 Automation Cards in wire order. A malformed card is dropped
 * locally so one bad stamp cannot invalidate its message.
 */ const automationCardsFromMessageParts = (parts)=>{
    const cards = [];
    for (const part of parts ?? []){
        if (part.messageType !== 'automation_card') continue;
        const parsed = automationCardContentSchema.safeParse(part.content);
        if (parsed.success) cards.push(parsed.data);
    }
    return cards;
};
/** Recording Note cards reuse the generated public server contract. */ const recordingNoteCardContentSchema = (/* unused pure expression or super */ null && (zMessageRecordingNoteCardContent));
const recordingNoteCardsFromMessageParts = (parts)=>{
    const cards = [];
    for (const part of parts ?? []){
        if (part.messageType !== 'recording_note_card') {
            continue;
        }
        const parsed = recordingNoteCardContentSchema.safeParse(part.content);
        if (parsed.success) {
            cards.push(parsed.data);
        }
    }
    return cards;
};
// ---------- Connector authorization cards ----------
const connectorAuthorizationStateSchema = discriminatedUnion('state', [
    schemas_object({
        state: literal('action_required')
    }).passthrough(),
    schemas_object({
        state: literal('authorizing'),
        attemptExpiresAt: schemas_string().datetime({
            offset: true
        })
    }).passthrough(),
    schemas_object({
        state: literal('session_expired')
    }).passthrough(),
    schemas_object({
        state: literal('failed_retriable'),
        code: schemas_string()
    }).passthrough(),
    schemas_object({
        state: literal('authorized'),
        completedAt: schemas_string().datetime({
            offset: true
        })
    }).passthrough(),
    schemas_object({
        state: literal('card_expired')
    }).passthrough()
]);
const connectorAuthorizationCardBodySchema = schemas_object({
    connector: schemas_object({
        connectorId: schemas_string().min(1),
        providerKey: schemas_string().min(1),
        authorizationDisplayName: schemas_string(),
        description: schemas_string().optional(),
        iconUrl: httpUrlSchema.optional(),
        detailDeeplink: schemas_string().min(1).optional(),
        operation: schemas_enum([
            'connect',
            'reauthorize'
        ])
    }).passthrough()
}).passthrough();
const connectorAuthorizationCardBaseSchema = schemas_object({
    cardId: schemas_string().min(1),
    interactionId: schemas_string().min(1),
    revision: schemas_number().int().positive(),
    schemaVersion: literal('today.connector_auth_card.v1'),
    body: connectorAuthorizationCardBodySchema,
    authorizationState: connectorAuthorizationStateSchema,
    createdAt: schemas_string().datetime({
        offset: true
    }),
    expiresAt: schemas_string().datetime({
        offset: true
    }).nullable()
}).passthrough();
const connectorAuthorizationCardContentSchema = discriminatedUnion('status', [
    connectorAuthorizationCardBaseSchema.extend({
        status: literal('init'),
        response: schemas_null()
    }),
    connectorAuthorizationCardBaseSchema.extend({
        status: literal('completed'),
        response: schemas_object({
            connectorAuthorized: literal(true),
            respondedAt: schemas_string().datetime({
                offset: true
            })
        }).passthrough()
    }),
    connectorAuthorizationCardBaseSchema.extend({
        status: literal('expired'),
        response: schemas_object({
            expiredReason: literal('timeout'),
            expiredAt: schemas_string().datetime({
                offset: true
            })
        }).passthrough()
    })
]).superRefine((value, context)=>{
    const state = value.authorizationState.state;
    const validState = value.status === 'init' && (state === 'action_required' || state === 'authorizing' || state === 'failed_retriable' || state === 'session_expired') || value.status === 'completed' && state === 'authorized' || value.status === 'expired' && state === 'card_expired';
    if (!validState) {
        context.addIssue({
            code: 'custom',
            path: [
                'authorizationState',
                'state'
            ],
            message: 'authorization state does not match Card status'
        });
    }
});
const connectorAuthorizationCardEnvelopeSchema = schemas_object({
    cardId: schemas_string().min(1),
    content: connectorAuthorizationCardContentSchema
}).passthrough().refine((value)=>value.cardId === value.content.cardId, {
    message: 'cardId must match content.cardId'
});
const connectorAuthorizationStartResponseSchema = schemas_object({
    success: literal(true),
    code: literal('common.ok'),
    message: schemas_string(),
    data: schemas_object({
        outcome: schemas_enum([
            'authorizationRequired',
            'alreadyAuthorized'
        ]),
        card: connectorAuthorizationCardContentSchema,
        authorization: schemas_object({
            url: httpUrlSchema,
            expiresAt: schemas_string().datetime({
                offset: true
            })
        }).passthrough().optional()
    }).passthrough()
}).passthrough().superRefine((value, context)=>{
    const hasAuthorization = value.data.authorization !== undefined;
    if (value.data.outcome === 'authorizationRequired' !== hasAuthorization) {
        context.addIssue({
            code: 'custom',
            path: [
                'data',
                'authorization'
            ],
            message: 'authorization is required only for authorizationRequired outcomes'
        });
    }
});
const connectorAuthorizationCardsFromMessageParts = (parts)=>{
    const cards = [];
    for (const part of parts ?? []){
        if (part.messageType !== 'connector_auth_card') {
            continue;
        }
        const parsed = connectorAuthorizationCardContentSchema.safeParse(part.content);
        if (parsed.success) {
            cards.push(parsed.data);
        }
    }
    return cards;
};
// ---------- Reply context ----------
const chatMessageReplyTargetTypeSchema = schemas_enum([
    'text',
    'attachment',
    'qa_single_select',
    'qa_multi_select',
    'qa_connector_auth',
    'qa_multi_page',
    'qa_cardflow_single',
    'connector_auth_card'
]);
const replyTargetTypeSchema = schemas_enum([
    ...chatMessageReplyTargetTypeSchema.options,
    'today_page_card',
    'today_brief',
    'day_in_progress_event'
]);
const KNOWN_REPLY_TARGET_TYPES = new Set(replyTargetTypeSchema.options);
const isKnownReplyTargetType = (value)=>KNOWN_REPLY_TARGET_TYPES.has(value);
const todayPageCardReplyPayloadSchema = schemas_object({
    widgetId: schemas_string().trim().min(1),
    kind: schemas_string().trim().min(1),
    summary: schemas_string().trim().min(1)
});
const todayPageCardReplySnapshotPayloadSchema = schemas_object({
    widgetId: schemas_string().trim().min(1),
    kind: schemas_string().trim().optional(),
    summary: schemas_string().trim().optional(),
    title: schemas_string().trim().optional(),
    localDate: schemas_string().optional()
}).passthrough();
const todayBriefReplyKindSchema = schemas_enum([
    'morning_brief',
    'evening_brief',
    'weekly_health_report'
]);
const todayBriefReplyPayloadSchema = schemas_object({
    kind: todayBriefReplyKindSchema,
    name: schemas_string().max(512).optional()
}).strict();
const dayInProgressEventReplyPayloadSchema = schemas_object({
    eventId: schemas_string().uuid()
}).strict();
const dayInProgressEventReplySnapshotPayloadSchema = schemas_object({
    eventId: schemas_string().uuid(),
    title: schemas_string().trim().min(1).optional(),
    description: schemas_string().nullable().optional(),
    summary: schemas_string().nullable().optional(),
    startAt: schemas_string().min(1).optional(),
    endAt: schemas_string().min(1).nullable().optional()
}).passthrough();
/**
 * Inbound reply target on a `SendMessageRequest`. `attachmentId` is required
 * iff `targetType === 'attachment'`. `quote` carries the exact text span the
 * user selected when starting a text reply.
 */ const chatMessageReplyTargetSchema = schemas_object({
    messageId: schemas_string().min(1),
    targetType: chatMessageReplyTargetTypeSchema,
    attachmentId: schemas_string().min(1).optional(),
    quote: schemas_string().min(1).optional(),
    cardId: schemas_string().min(1).optional()
}).refine((value)=>value.targetType !== 'attachment' || typeof value.attachmentId === 'string', {
    message: 'attachmentId is required when targetType is "attachment"'
}).refine((value)=>value.targetType === 'text' || value.quote === undefined, {
    message: 'quote is only supported when targetType is "text"'
}).refine((value)=>!value.targetType.startsWith('qa_') && value.targetType !== 'connector_auth_card' || typeof value.cardId === 'string', {
    message: 'cardId is required when targetType is a Card'
});
const todayPageCardReplyTargetSchema = schemas_object({
    targetType: literal('today_page_card'),
    payload: todayPageCardReplyPayloadSchema
});
const todayBriefReplyTargetSchema = schemas_object({
    targetType: literal('today_brief'),
    payload: todayBriefReplyPayloadSchema
}).strict();
const dayInProgressEventReplyTargetSchema = schemas_object({
    targetType: literal('day_in_progress_event'),
    quote: schemas_string().trim().min(1),
    payload: dayInProgressEventReplyPayloadSchema
}).strict();
const replyTargetSchema = schemas_union([
    chatMessageReplyTargetSchema,
    todayPageCardReplyTargetSchema,
    todayBriefReplyTargetSchema,
    dayInProgressEventReplyTargetSchema
]);
/**
 * Outbound snapshot embedded on a message when it is a reply. Carried by
 * BOTH the REST history surface AND the `chat.message_ready` realtime
 * signal (the macOS `ChatMessageReadyDTO` declares `replyTo` inline — see
 * `chatMessageReadyDataSchema`). `quote` is the user-selected quote span;
 * the reply bubble prefers `quote` over the full `content` when present
 * (mirrors macOS `ChatReplyPreview.init(snapshot:)` — `quote ?? content`).
 */ const replySnapshotSchema = schemas_object({
    messageId: schemas_string().min(1),
    role: schemas_string(),
    targetType: replyTargetTypeSchema,
    content: schemas_string().optional(),
    quote: schemas_string().optional(),
    cardId: schemas_string().min(1).optional(),
    payload: schemas_union([
        todayPageCardReplySnapshotPayloadSchema,
        todayBriefReplyPayloadSchema,
        dayInProgressEventReplySnapshotPayloadSchema,
        dayInProgressEventReplyPayloadSchema
    ]).optional(),
    attachment: schemas_object({
        id: schemas_string(),
        filename: schemas_string(),
        title: schemas_string().optional(),
        summary: schemas_string().optional(),
        mimeType: schemas_string(),
        size: schemas_number().int().nonnegative()
    }).passthrough().optional()
}).passthrough().refine((value)=>value.targetType !== 'today_page_card' || value.payload !== undefined, 'payload is required when targetType is "today_page_card"').refine((value)=>value.targetType !== 'today_brief' || value.payload !== undefined, 'payload is required when targetType is "today_brief"').refine((value)=>value.targetType !== 'day_in_progress_event' || value.payload !== undefined, 'payload is required when targetType is "day_in_progress_event"');
const unknownReplySnapshotSchema = schemas_object({
    targetType: schemas_string().min(1)
}).passthrough().refine(({ targetType })=>!isKnownReplyTargetType(targetType)).transform(()=>undefined);
/**
 * Inbound messages may contain reply targets introduced by a newer server.
 * Keep known snapshots strict, but drop an unknown reply instead of rejecting
 * its surrounding message.
 */ const inboundReplySnapshotSchema = schemas_union([
    replySnapshotSchema,
    unknownReplySnapshotSchema
]);
// ---------- Send message ----------
/**
 * Body of `POST /v1/messages`. Mirrors `MessageRequest` at
 * `services/agent-service/src/routes/message.ts:16-50`.
 *
 * `clientMessageId` is required by chat-v2 to drive ack-then-write
 * reconciliation even though the backend marks it optional.
 *
 * `channel` is intentionally optional on the wire — the backend reads
 * the channel from the `X-Channel` request header, not the body, so the
 * body field is informational only. chat-v2 omits it entirely (matches
 * the macOS client). Kept on the schema for forward-compat with
 * consumers that may still set it.
 */ const sendMessageRequestSchema = schemas_object({
    message: schemas_string().optional(),
    messages: schemas_array(schemas_string()).optional(),
    content: schemas_string().optional(),
    messageType: literal('text').optional(),
    channel: schemas_string().min(1).optional(),
    clientMessageId: schemas_string().min(1),
    threadId: schemas_string().min(1).optional(),
    conversationId: schemas_string().min(1).optional(),
    channelContext: schemas_record(schemas_string(), schemas_string()).optional(),
    mode: schemas_string().min(1).optional(),
    triggerType: schemas_enum([
        'user_message',
        'system'
    ]).optional(),
    attachments: schemas_array(sendAttachmentRefSchema).optional(),
    replyTo: replyTargetSchema.optional(),
    sourceDeviceId: schemas_string().min(1).optional(),
    images: schemas_array(schemas_string()).optional()
}).refine((value)=>value.content === undefined === (value.messageType === undefined), {
    message: 'content and messageType must be provided together'
});
/**
 * Response of `POST /v1/messages` (HTTP 202). The actual assistant reply
 * arrives later through Cloud WebSocket, not in this body.
 *
 * Source: `services/backend-service/src/routes/messages.ts:285-292`.
 */ const sendMessageResponseSchema = schemas_object({
    threadId: schemas_string().min(1),
    messageId: schemas_string().min(1),
    clientMessageId: schemas_string().optional(),
    createdAt: schemas_string().min(1),
    isDuplicate: schemas_boolean()
}).passthrough();
// ---------- List messages ----------
const listMessagesQuerySchema = schemas_object({
    threadId: schemas_string().min(1).optional(),
    types: schemas_string().optional(),
    limit: schemas_number().int().positive().optional(),
    channel: schemas_string().optional(),
    excludeInternal: schemas_enum([
        'true',
        'false'
    ]).optional(),
    before: schemas_string().min(1).optional(),
    grouped: schemas_enum([
        'true',
        'false'
    ]).optional()
});
const publicMessageSchema = lazy(()=>schemas_object({
        id: schemas_string().min(1),
        threadId: schemas_string().min(1),
        role: schemas_string().min(1),
        content: schemas_string(),
        messageType: schemas_string().min(1),
        channel: schemas_string(),
        isFinal: schemas_boolean(),
        state: schemas_string().optional(),
        createdAt: schemas_string().min(1),
        cursor: schemas_string().min(1),
        clientMessageId: schemas_string().optional(),
        originClientMessageId: schemas_string().nullish(),
        originClientMessageIds: schemas_array(schemas_string()).nullish(),
        originTriggerType: schemas_string().optional(),
        attachments: schemas_object({
            files: schemas_array(fileAttachmentSchema).optional(),
            linkPreviews: schemas_array(linkPreviewSchema).optional()
        }).passthrough().optional(),
        replyTo: inboundReplySnapshotSchema.optional(),
        cards: schemas_array(qaCardEnvelopeSchema).optional(),
        intermediates: schemas_array(publicMessageSchema).optional(),
        messages: schemas_array(messagePartSchema).optional()
    }).passthrough());
const listMessagesResponseSchema = schemas_object({
    object: literal('list'),
    data: schemas_array(publicMessageSchema),
    total: schemas_number().int().nonnegative(),
    hasMore: schemas_boolean(),
    nextCursor: schemas_string().nullable()
}).passthrough();
// ---------- Messages v2 REST ----------
const typedMessageV2ReplyToSchema = schemas_object({
    targetType: schemas_string().min(1),
    payload: schemas_record(schemas_string(), unknown())
}).passthrough();
const typedMessageV2Schema = schemas_object({
    id: schemas_string().min(1),
    threadId: schemas_string().min(1),
    role: schemas_string().min(1),
    messages: schemas_array(messagePartSchema),
    channel: schemas_string(),
    isFinal: schemas_boolean(),
    state: schemas_string().optional(),
    createdAt: schemas_string().min(1),
    cursor: schemas_string().min(1),
    clientMessageId: schemas_string().optional(),
    originClientMessageId: schemas_string().optional(),
    originClientMessageIds: schemas_array(schemas_string()).optional(),
    originTriggerType: schemas_string().optional(),
    replyTo: typedMessageV2ReplyToSchema.optional()
}).passthrough();
const listMessagesV2ResponseSchema = schemas_object({
    object: literal('list'),
    data: schemas_array(typedMessageV2Schema),
    total: schemas_number().int().nonnegative().optional(),
    hasMore: schemas_boolean(),
    nextCursor: schemas_string().nullable()
}).passthrough();
const batchMessagesV2RequestSchema = schemas_object({
    messageIds: schemas_array(schemas_string().min(1)).min(1).max(50)
});
const batchMessagesV2ResponseSchema = schemas_object({
    object: literal('list'),
    data: schemas_array(typedMessageV2Schema),
    missing: schemas_array(schemas_string())
}).passthrough();
/**
 * Project `/v2/messages` rows back into the `PublicMessage` shape consumed by
 * the current store/UI while preserving the authoritative `messages[]` parts.
 *
 * This is the temporary compatibility layer for the migration: the store
 * already understands turn/text parts, but attachments, link previews, and QA
 * cards are still read from the older v1 top-level fields.
 */ function typedMessageV2ToPublicMessage(message) {
    const { replyTo: v2ReplyTo, ...rest } = message;
    const files = filesFromMessageParts(message.messages);
    const linkPreviews = linkPreviewsFromMessageParts(message.messages);
    const cards = qaCardsFromMessageParts(message.messages);
    const replyTo = replySnapshotFromV2(v2ReplyTo);
    const attachments = files.length > 0 || linkPreviews.length > 0 ? {
        ...files.length > 0 ? {
            files
        } : {},
        ...linkPreviews.length > 0 ? {
            linkPreviews
        } : {}
    } : undefined;
    return {
        ...rest,
        content: textFromV2MessageParts(message.messages),
        messageType: messageTypeFromV2MessageParts(message.messages),
        ...attachments ? {
            attachments
        } : {},
        ...cards.length > 0 ? {
            cards
        } : {},
        ...replyTo ? {
            replyTo
        } : {}
    };
}
function textFromV2MessageParts(parts) {
    const texts = [];
    for (const part of parts){
        if (part.messageType !== 'text') continue;
        const content = recordFromUnknown(part.content);
        const text = content?.text;
        if (typeof text === 'string') {
            texts.push(text);
        }
    }
    return texts.join('\n');
}
function messageTypeFromV2MessageParts(parts) {
    const renderable = parts.find((part)=>!isThinkingMessagePart(part));
    return renderable?.messageType ?? parts[0]?.messageType ?? 'text';
}
function isThinkingMessagePart(part) {
    return part.messageType === 'turn' || part.messageType === 'tool_call' || part.messageType === 'tool_call_summary';
}
function filesFromMessageParts(parts) {
    const files = [];
    for (const part of parts){
        if (part.messageType !== 'image' && part.messageType !== 'file' && part.messageType !== 'voice') {
            continue;
        }
        const file = fileAttachmentFromMessagePart(part);
        if (file) files.push(file);
    }
    return files;
}
function fileAttachmentFromMessagePart(part) {
    const content = recordFromUnknown(part.content);
    if (!content) return null;
    const id = stringField(content, 'id');
    const filename = stringField(content, 'filename');
    const title = stringField(content, 'title');
    const summary = stringField(content, 'summary');
    const mimeType = stringField(content, 'mimeType');
    const storagePath = stringField(content, 'storagePath');
    const previewUrl = stringField(content, 'previewUrl');
    const downloadUrl = stringField(content, 'downloadUrl');
    const size = numberField(content, 'size');
    if (!id || !filename || !mimeType || !downloadUrl || size === null) return null;
    const candidate = {
        id,
        filename,
        ...title ? {
            title
        } : {},
        ...summary ? {
            summary
        } : {},
        mimeType,
        size,
        ...storagePath ? {
            storagePath
        } : {},
        ...previewUrl ? {
            previewUrl
        } : {},
        downloadUrl,
        type: attachmentTypeFromV2Part(part.messageType, mimeType),
        ...numberField(content, 'width') !== null ? {
            width: numberField(content, 'width')
        } : {},
        ...numberField(content, 'height') !== null ? {
            height: numberField(content, 'height')
        } : {},
        ...part.messageType === 'voice' ? voiceMetadataFromV2Content(content) : {}
    };
    const parsed = fileAttachmentSchema.safeParse(candidate);
    return parsed.success ? parsed.data : null;
}
function attachmentTypeFromV2Part(messageType, mimeType) {
    if (messageType === 'voice') return 'voice';
    if (messageType === 'image') return 'image';
    if (mimeType === 'application/pdf') return 'pdf';
    if (mimeType.startsWith('text/')) return 'text';
    return 'file';
}
function voiceMetadataFromV2Content(content) {
    const durationMs = numberField(content, 'durationMs');
    const sampleRate = numberField(content, 'sampleRate');
    const channels = numberField(content, 'channels');
    if (durationMs === null || content.container !== 'ogg' || content.audioCodec !== 'opus' || sampleRate === null || channels === null) {
        return {};
    }
    const transcription = voiceTranscriptionSchema.safeParse(content.transcription);
    const waveform = Array.isArray(content.waveform) ? content.waveform.filter((value)=>typeof value === 'number') : undefined;
    const voice = {
        durationMs,
        container: 'ogg',
        audioCodec: 'opus',
        sampleRate,
        channels,
        ...stringField(content, 'voiceStreamId') ? {
            voiceStreamId: stringField(content, 'voiceStreamId')
        } : {},
        ...transcription.success ? {
            transcription: transcription.data
        } : {},
        ...waveform && waveform.length > 0 ? {
            waveform
        } : {}
    };
    return {
        voice
    };
}
function linkPreviewsFromMessageParts(parts) {
    const previews = [];
    for (const part of parts){
        if (part.messageType !== 'linkPreview') continue;
        const parsed = linkPreviewSchema.safeParse(part.content);
        if (parsed.success) previews.push(parsed.data);
    }
    return previews;
}
function qaCardsFromMessageParts(parts) {
    const cards = [];
    for (const part of parts){
        if (!isQACardMessageType(part.messageType)) continue;
        const content = recordFromUnknown(part.content);
        const cardId = stringField(content, 'card_id');
        if (!content || !cardId) continue;
        const envelope = {
            card_id: cardId,
            message_type: part.messageType,
            content: {
                ...content,
                card_id: cardId
            }
        };
        const parsed = qaCardEnvelopeSchema.safeParse(envelope);
        cards.push(parsed.success ? parsed.data : envelope);
    }
    return cards;
}
function isQACardMessageType(value) {
    return value === 'qa_single_select' || value === 'qa_multi_select' || value === 'qa_connector_auth' || value === 'qa_multi_page' || value === 'qa_cardflow_single';
}
const replySnapshotFromV2 = (replyTo)=>{
    if (!replyTo) return undefined;
    const payload = replyTo.payload;
    const targetType = replyTo.targetType;
    if (!isKnownReplyTargetType(targetType)) return undefined;
    if (targetType === 'today_page_card') {
        const reference = todayPageCardReplySnapshotPayloadSchema.safeParse(payload);
        if (!reference.success) return undefined;
        const content = reference.data.summary || reference.data.title || '';
        return {
            messageId: reference.data.widgetId,
            role: 'today_page',
            targetType: 'today_page_card',
            content,
            payload: reference.data
        };
    }
    if (targetType === 'today_brief') {
        const reference = todayBriefReplyPayloadSchema.safeParse(payload);
        if (!reference.success) return undefined;
        const content = reference.data.name ?? reference.data.kind;
        return {
            messageId: reference.data.kind,
            role: 'today_page',
            targetType: 'today_brief',
            content,
            payload: reference.data
        };
    }
    if (replyTo.targetType === 'day_in_progress_event') {
        const event = dayInProgressEventReplySnapshotPayloadSchema.safeParse(payload);
        if (event.success) {
            const quote = stringField(recordFromUnknown(replyTo), 'quote');
            return {
                messageId: event.data.eventId,
                role: 'calendar',
                targetType: 'day_in_progress_event',
                content: quote ?? event.data.title ?? '',
                ...quote ? {
                    quote
                } : {},
                payload: event.data
            };
        }
    }
    const messageId = stringField(payload, 'messageId');
    const role = stringField(payload, 'role');
    if (!messageId || !role) return undefined;
    if (targetType === 'attachment') {
        const attachment = fileAttachmentSchema.pick({
            id: true,
            filename: true,
            title: true,
            summary: true,
            mimeType: true,
            size: true,
            downloadUrl: true,
            type: true,
            width: true,
            height: true,
            voice: true
        }).partial({
            downloadUrl: true
        }).safeParse(payload);
        return {
            messageId,
            role,
            targetType: 'attachment',
            ...attachment.success ? {
                attachment: attachment.data
            } : {}
        };
    }
    return {
        messageId,
        role,
        targetType,
        ...stringField(payload, 'content') ? {
            content: stringField(payload, 'content')
        } : {},
        ...stringField(payload, 'cardId') ? {
            cardId: stringField(payload, 'cardId')
        } : {}
    };
};
function recordFromUnknown(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}
function stringField(record, key) {
    const value = record?.[key];
    return typeof value === 'string' && value.length > 0 ? value : null;
}
function numberField(record, key) {
    const value = record?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
