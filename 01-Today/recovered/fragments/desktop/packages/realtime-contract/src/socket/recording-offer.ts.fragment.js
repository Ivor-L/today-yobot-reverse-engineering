// Compiled fragment from ../../packages/realtime-contract/src/socket/recording-offer.ts.
// The original TypeScript and import graph are not restored.



const recording_offer_identifierSchema = schemas_string().trim().min(1).max(256);
const epochSecondsSchema = schemas_number().int().nonnegative().max(8640000000000);
const REMINDER_DURATION_MS = 5 * 60000;
/** The recording subtype of notification.deliver; unrelated notifications stay private. */ const recordingOfferNotificationPayloadSchema = schemas_object({
    data: schemas_object({
        notificationId: recording_offer_identifierSchema,
        type: literal('recording-offer'),
        extraData: schemas_object({
            schemaVersion: literal(1),
            kind: literal('recording_offer'),
            userId: recording_offer_identifierSchema,
            planId: recording_offer_identifierSchema,
            sourceNamespace: recording_offer_identifierSchema,
            occurrenceId: recording_offer_identifierSchema,
            scheduledActionId: recording_offer_identifierSchema,
            title: schemas_string().max(400),
            startAtEpochSeconds: epochSecondsSchema,
            endAtEpochSeconds: epochSecondsSchema.nullable(),
            startDeadlineEpochSeconds: epochSecondsSchema,
            reminderExpiresAtEpochSeconds: epochSecondsSchema,
            openUrl: schemas_string().max(2048)
        }).refine((offer)=>{
            return offer.reminderExpiresAtEpochSeconds > offer.startAtEpochSeconds && (offer.endAtEpochSeconds === null || offer.endAtEpochSeconds > offer.startAtEpochSeconds);
        }, 'Recording offer timestamps must form a valid interval')
    })
});
const recordingOfferFromSocketMessage = (message, accountId)=>{
    if (message.type !== socketEventNames.notification.deliver) {
        return null;
    }
    const parsed = recordingOfferNotificationPayloadSchema.safeParse(message.payload);
    if (!parsed.success || parsed.data.data.extraData.userId !== accountId) {
        return null;
    }
    const offer = parsed.data.data.extraData;
    return {
        id: offer.scheduledActionId,
        title: offer.title,
        startAtEpochMs: offer.startAtEpochSeconds * 1000,
        ...offer.endAtEpochSeconds === null ? {} : {
            endAtEpochMs: offer.endAtEpochSeconds * 1000
        },
        expiresAtEpochMs: Math.min(offer.reminderExpiresAtEpochSeconds * 1000, offer.startAtEpochSeconds * 1000 + REMINDER_DURATION_MS)
    };
};
const scheduledRecordingActionSchema = schemas_object({
    id: recording_offer_identifierSchema,
    kind: literal('recording_offer'),
    scheduledAt: schemas_string().datetime({
        offset: true
    }),
    expiresAt: schemas_string().datetime({
        offset: true
    }),
    payload: schemas_object({
        title: schemas_string(),
        plannedEndAt: schemas_string().datetime({
            offset: true
        }).nullish()
    })
});
const recordingOfferFromScheduledAction = (action)=>{
    const parsed = scheduledRecordingActionSchema.safeParse(action);
    if (!parsed.success) {
        return null;
    }
    const { id, payload, scheduledAt, expiresAt } = parsed.data;
    const startAtEpochMs = Date.parse(scheduledAt);
    const expiresAtEpochMs = Math.min(Date.parse(expiresAt), startAtEpochMs + REMINDER_DURATION_MS);
    const endAtEpochMs = payload.plannedEndAt ? Date.parse(payload.plannedEndAt) : undefined;
    if (expiresAtEpochMs <= startAtEpochMs || endAtEpochMs !== undefined && endAtEpochMs <= startAtEpochMs) {
        return null;
    }
    return {
        id,
        title: payload.title,
        startAtEpochMs,
        ...endAtEpochMs === undefined ? {} : {
            endAtEpochMs
        },
        expiresAtEpochMs
    };
};
