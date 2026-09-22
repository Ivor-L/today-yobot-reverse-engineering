// Compiled fragment from ../../packages/realtime-contract/src/socket/schemas.ts.
// The original TypeScript and import graph are not restored.




const canonicalIdentifierSchema = schemas_string().trim().min(1).max(256);
const canonicalHighWatermarkSchema = schemas_number().int().positive().max(Number.MAX_SAFE_INTEGER);
const agentMessageChangesAvailableV1EventSchema = schemas_object({
    event: literal(socketEventNames.agent.messageChangesAvailableV1),
    threadId: canonicalIdentifierSchema,
    userId: canonicalIdentifierSchema.optional(),
    data: schemas_object({
        conversationId: canonicalIdentifierSchema,
        highWatermark: canonicalHighWatermarkSchema
    })
}).superRefine((payload, context)=>{
    if (payload.threadId === payload.data.conversationId) {
        return;
    }
    context.addIssue({
        code: 'custom',
        path: [
            'threadId'
        ],
        message: 'Canonical wake threadId must equal data.conversationId'
    });
});
const connectorsChangedPayloadSchema = schemas_object({
    data: schemas_object({
        reason: literal('connected'),
        provider: schemas_string().min(1),
        connectionId: schemas_string().min(1),
        occurredAt: schemas_string().datetime()
    }).strip()
}).strip();
const automationPayloadSchema = schemas_object({
    ruleId: schemas_string().min(1).optional(),
    data: schemas_object({
        ruleId: schemas_string().min(1).optional(),
        ruleKind: schemas_string().min(1).optional()
    }).optional()
});
const memoryFileChangedPayloadSchema = schemas_object({
    data: schemas_object({
        needPull: schemas_boolean().optional()
    }).optional()
});
/**
 * `rapport.updated.v1` — what the server pushes each time it credits points.
 *
 * Deliberately strict, matching the native clients: all five fields are required, the numbers must
 * arrive as numbers rather than as strings, and `nextLevelPoints` is `null` only at the top of the
 * ladder. A payload that misses any of that is dropped rather than half-applied — the event exists
 * to move a gauge, and a partial read would move it somewhere wrong.
 *
 * No localized copy rides along: `currentLevelKey` is an identity, and the level's name has to come
 * from an HTTP read in the user's current language.
 */ const rapportUpdatedPayloadSchema = schemas_object({
    data: schemas_object({
        currentPoints: schemas_number().int(),
        nextLevelPoints: schemas_number().int().nullable(),
        progress: schemas_number().finite(),
        currentLevelKey: schemas_string().trim().min(1),
        updatedAt: schemas_string().datetime()
    })
});
const rawDevicesUpdatedPayloadSchema = schemas_object({
    devices: schemas_array(schemas_object({
        id: schemas_string().min(1),
        online: schemas_boolean()
    }))
});
const taskScopedPayloadSchema = schemas_object({
    taskId: schemas_string().min(1).optional(),
    data: schemas_object({
        taskId: schemas_string().min(1).optional()
    }).optional(),
    payload: schemas_object({
        taskId: schemas_string().min(1).optional()
    }).optional()
}).refine((payload)=>Boolean(payload.taskId ?? payload.data?.taskId ?? payload.payload?.taskId), 'A task-scoped event must identify its task');
const userIndicatorPayloadSchema = schemas_object({
    items: schemas_array(zUserIndicatorItem)
});
