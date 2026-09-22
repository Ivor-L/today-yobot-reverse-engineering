// Compiled fragment from ../../packages/realtime-contract/src/socket/normalization.ts.
// The original TypeScript and import graph are not restored.






const DOMAIN_EVENT_WIRE_SCHEMAS = new Map([
    [
        socketEventNames.agent.messageChangesAvailableV1,
        agentMessageChangesAvailableV1EventSchema
    ],
    ...[
        socketEventNames.chat.toolStartedV2,
        socketEventNames.chat.toolCompletedV2,
        socketEventNames.chat.runCompletedV2,
        socketEventNames.chat.runFailedV2
    ].map((eventName)=>[
            eventName,
            schemas_object({
                event: literal(eventName),
                data: schemas_object({
                    messageProtocolVersion: literal('canonical-v1'),
                    conversationId: schemas_string().min(1)
                }).passthrough()
            }).passthrough()
        ])
]);
const DOMAIN_EVENT_PAYLOAD_SCHEMAS = new Map([
    [
        socketEventNames.notification.deliver,
        recordingOfferNotificationPayloadSchema
    ],
    [
        socketEventNames.connectors.changedV1,
        connectorsChangedPayloadSchema
    ],
    [
        socketEventNames.memory.fileChanged,
        memoryFileChangedPayloadSchema
    ],
    ...taskRunSocketEvents.map((eventName)=>[
            eventName,
            taskScopedPayloadSchema
        ]),
    ...automationLifecycleSocketEvents.map((eventName)=>[
            eventName,
            automationPayloadSchema
        ]),
    [
        socketEventNames.agentIndicator.statusV1,
        zAgentIndicatorStatusResponse
    ],
    [
        socketEventNames.userIndicator.changedV1,
        userIndicatorPayloadSchema
    ]
]);
const SIGNAL_EVENT_NAMES = new Set([
    socketEventNames.cloud.devicesUpdated,
    socketEventNames.dayInProgress.eventsChangedV1,
    socketEventNames.profile.changedV1,
    socketEventNames.pricing.noticesChangedV1,
    socketEventNames.pricing.statusChangedV1,
    socketEventNames.task.recommendations.readyV1
]);
const TASK_EVENT_SUFFIX_PATTERN = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/;
const TASK_PATTERN_PREFIXES = [
    socketEventNames.task.plan.prefix,
    socketEventNames.task.step.prefix
];
const isPlainRecord = (value)=>{
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
};
const normalization_isJsonValue = (value)=>{
    if (value === null || typeof value === 'string' || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(normalization_isJsonValue);
    }
    if (!isPlainRecord(value)) {
        return false;
    }
    return Object.values(value).every(normalization_isJsonValue);
};
const isJsonRecord = (value)=>{
    if (!isPlainRecord(value)) {
        return false;
    }
    return Object.values(value).every(normalization_isJsonValue);
};
const omitField = (value, field)=>{
    return Object.fromEntries(Object.entries(value).filter(([key])=>key !== field));
};
const isAllowlistedTaskPatternEvent = (eventName)=>{
    return TASK_PATTERN_PREFIXES.some((prefix)=>{
        if (!eventName.startsWith(prefix)) {
            return false;
        }
        return TASK_EVENT_SUFFIX_PATTERN.test(eventName.slice(prefix.length));
    });
};
const validateEventPushPayload = (eventName, payload)=>{
    if (eventName === 'keepalive') {
        return null;
    }
    const nestedData = isPlainRecord(payload['data']) ? payload['data'] : null;
    const isCanonicalChatSnapshotEvent = (eventName === socketEventNames.chat.messageReadyV2 || eventName === socketEventNames.chat.messageUpdatedV2 || eventName === socketEventNames.chat.presentationUpdatedV1) && nestedData?.['messageProtocolVersion'] === 'canonical-v1';
    if (isKnownEventName(eventName)) {
        const result = parseEventPushPayload({
            event: eventName,
            ...payload
        });
        if (result.kind !== 'event' || !isJsonRecord(result.event.data)) {
            return null;
        }
        // Legacy Chat events expose their event data as the normalized payload.
        // Frozen Canonical events already carry a namespaced `data` envelope that
        // the Canonical dispatcher validates, so preserve that boundary intact.
        return isCanonicalChatSnapshotEvent ? payload : result.event.data;
    }
    if (SIGNAL_EVENT_NAMES.has(eventName)) {
        return {};
    }
    const wireSchema = DOMAIN_EVENT_WIRE_SCHEMAS.get(eventName);
    if (wireSchema) {
        const result = wireSchema.safeParse({
            event: eventName,
            ...payload
        });
        if (!result.success || !isJsonRecord(result.data)) {
            return null;
        }
        return omitField(result.data, 'event');
    }
    let schema = DOMAIN_EVENT_PAYLOAD_SCHEMAS.get(eventName);
    if (isAllowlistedTaskPatternEvent(eventName)) {
        schema = taskScopedPayloadSchema;
    }
    const result = schema?.safeParse(payload);
    if (!result?.success || !isJsonRecord(result.data)) {
        return null;
    }
    return result.data;
};
const normalizeEventPush = (message)=>{
    const { event, ...payload } = message.payload;
    if (!event || !isJsonRecord(payload)) {
        return null;
    }
    const validated = validateEventPushPayload(event, payload);
    if (!validated) {
        return null;
    }
    return {
        type: event,
        payload: validated
    };
};
const normalizeSocketMessage = (message)=>{
    const type = message['type'];
    if (type !== socketEventNames.cloud.devicesUpdated) {
        return null;
    }
    const payload = Object.fromEntries(Object.entries(message).filter(([key])=>key !== 'type'));
    if (!isJsonRecord(payload)) {
        return null;
    }
    if (!rawDevicesUpdatedPayloadSchema.safeParse(payload).success) {
        return null;
    }
    return {
        type,
        payload: {}
    };
};
