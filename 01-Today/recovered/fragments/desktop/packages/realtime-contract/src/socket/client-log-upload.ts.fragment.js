// Compiled fragment from ../../packages/realtime-contract/src/socket/client-log-upload.ts.
// The original TypeScript and import graph are not restored.



const CLIENT_LOG_UPLOAD_ACCEPTED_FRAME_TYPE = 'client_log.upload.accepted.v1';
const CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE = 'client_log.upload.progress.v1';
const CLIENT_LOG_UPLOAD_COMPLETED_FRAME_TYPE = 'client_log.upload.completed.v1';
const CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE = 'client_log.upload.failed.v1';
const clientLogUploadRequestIdSchema = schemas_string().trim().uuid();
const clientLogUploadErrorCodeSchema = schemas_string().trim().min(1).max(64);
const clientLogUploadLogIdSchema = schemas_string().trim().uuid();
const clientLogUploadRequestedEventSchema = schemas_object({
    event: literal(socketEventNames.clientLog.upload.requestedV1),
    requestId: clientLogUploadRequestIdSchema
});
const clientLogUploadCancelledEventSchema = schemas_object({
    event: literal(socketEventNames.clientLog.upload.cancelledV1),
    requestId: clientLogUploadRequestIdSchema
});
const clientLogUploadCommandSchema = discriminatedUnion('event', [
    clientLogUploadRequestedEventSchema,
    clientLogUploadCancelledEventSchema
]);
const clientLogUploadAcceptedFrameSchema = schemas_object({
    type: literal(CLIENT_LOG_UPLOAD_ACCEPTED_FRAME_TYPE),
    requestId: clientLogUploadRequestIdSchema
});
const clientLogUploadProgressFrameSchema = schemas_object({
    type: literal(CLIENT_LOG_UPLOAD_PROGRESS_FRAME_TYPE),
    requestId: clientLogUploadRequestIdSchema,
    progress: schemas_number().min(0).max(1)
});
const clientLogUploadCompletedFrameSchema = schemas_object({
    type: literal(CLIENT_LOG_UPLOAD_COMPLETED_FRAME_TYPE),
    requestId: clientLogUploadRequestIdSchema,
    logId: clientLogUploadLogIdSchema.optional()
});
const clientLogUploadFailedFrameSchema = schemas_object({
    type: literal(CLIENT_LOG_UPLOAD_FAILED_FRAME_TYPE),
    requestId: clientLogUploadRequestIdSchema,
    errorCode: clientLogUploadErrorCodeSchema
});
const clientLogUploadOutboundFrameSchema = discriminatedUnion('type', [
    clientLogUploadAcceptedFrameSchema,
    clientLogUploadProgressFrameSchema,
    clientLogUploadCompletedFrameSchema,
    clientLogUploadFailedFrameSchema
]);
const client_log_upload_isRecord = (value)=>{
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};
const parseClientLogUploadCommand = (message)=>{
    const payload = message.payload;
    if (!client_log_upload_isRecord(payload)) {
        return {
            status: 'unrelated'
        };
    }
    const event = payload['event'];
    const isClientLogUploadEvent = event === socketEventNames.clientLog.upload.requestedV1 || event === socketEventNames.clientLog.upload.cancelledV1;
    if (!isClientLogUploadEvent) {
        return {
            status: 'unrelated'
        };
    }
    const result = clientLogUploadCommandSchema.safeParse(payload);
    if (!result.success) {
        return {
            status: 'invalid'
        };
    }
    return {
        status: 'valid',
        command: result.data
    };
};
