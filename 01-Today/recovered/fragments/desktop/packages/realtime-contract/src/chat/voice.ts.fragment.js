// Compiled fragment from ../../packages/realtime-contract/src/chat/voice.ts.
// The original TypeScript and import graph are not restored.


const voiceStreamEventNames = (/* unused pure expression or super */ null && ({
    client: {
        cancel: 'voice_stream.cancel',
        finalize: 'voice_stream.finalize',
        start: 'voice_stream.start'
    },
    server: {
        committedV1: 'voice_stream.committed.v1',
        ready: 'voice_stream.ready',
        startedV1: 'voice_stream.started.v1',
        transcriptErrorV1: 'voice_stream.transcript.error.v1',
        transcriptFinalV1: 'voice_stream.transcript.final.v1',
        transcriptPartialV1: 'voice_stream.transcript.partial.v1'
    }
}));
const VOICE_STREAM_AUDIO_FORMAT = (/* unused pure expression or super */ null && ({
    encoding: 'pcm_s16le',
    sampleRateHertz: 16000,
    channels: 1,
    chunkMs: 50
}));
const voiceTranscriptionLookupResponseSchema = schemas_object({
    data: schemas_object({
        transcription: schemas_object({
            status: schemas_enum([
                'pending',
                'streaming',
                'completed',
                'failed',
                'timeout'
            ]),
            transcript: schemas_string(),
            languageCode: schemas_string(),
            failureCode: schemas_string().optional()
        })
    })
});
const normalizeVoiceStreamCreateResponse = (raw)=>{
    const record = asRecord(raw);
    const streamId = voice_stringField(record, 'streamId');
    const audioUploadUrl = voice_stringField(record, 'audioUploadUrl');
    if (!streamId || !audioUploadUrl) {
        throw new Error('Voice stream response did not match expected schema.');
    }
    const voiceWebSocketUrl = voice_stringField(record, 'voiceWebSocketUrl');
    return {
        streamId,
        audioUploadUrl,
        ...voiceWebSocketUrl ? {
            voiceWebSocketUrl
        } : {},
        audioFormat: normalizeAudioFormat(record?.['audioFormat'])
    };
};
const parseVoiceStreamEnvelope = (data)=>{
    if (typeof data !== 'string') {
        return null;
    }
    try {
        const raw = JSON.parse(data);
        const record = asRecord(raw);
        if (!record) {
            return null;
        }
        const type = voice_stringField(record, 'type');
        if (!type) {
            return null;
        }
        return {
            type,
            ...typeof record['seq'] === 'number' ? {
                seq: record['seq']
            } : {},
            payload: record['payload']
        };
    } catch  {
        return null;
    }
};
const parseVoiceStreamTranscriptPayload = (payload)=>{
    const record = asRecord(payload);
    if (!record) {
        return null;
    }
    const streamId = voice_stringField(record, 'streamId');
    const segmentId = voice_stringField(record, 'segmentId');
    const text = voice_stringField(record, 'text');
    if (!streamId || !segmentId || text == null) {
        return null;
    }
    return {
        streamId,
        segmentId,
        text,
        isFinal: record['isFinal'] === true
    };
};
const parseVoiceStreamErrorPayload = (payload)=>{
    const record = asRecord(payload);
    if (!record) {
        return null;
    }
    const streamId = voice_stringField(record, 'streamId');
    const code = voice_stringField(record, 'code');
    return {
        ...streamId ? {
            streamId
        } : {},
        ...code ? {
            code
        } : {},
        ...typeof record['retryable'] === 'boolean' ? {
            retryable: record['retryable']
        } : {}
    };
};
const parseVoiceStreamCommittedPayload = (payload)=>{
    const record = asRecord(payload);
    if (!record) {
        return null;
    }
    const streamId = voice_stringField(record, 'streamId');
    if (!streamId) {
        return null;
    }
    const transcript = voice_stringField(record, 'transcript');
    const languageCode = voice_stringField(record, 'languageCode');
    const receivedAudioMs = voice_numberField(record, 'receivedAudioMs');
    return {
        streamId,
        ...transcript != null ? {
            transcript
        } : {},
        ...languageCode ? {
            languageCode
        } : {},
        ...typeof record['isEmpty'] === 'boolean' ? {
            isEmpty: record['isEmpty']
        } : {},
        ...receivedAudioMs != null ? {
            receivedAudioMs
        } : {}
    };
};
const parseVoiceStreamAudioUploadCommittedPayload = (payload)=>{
    const record = asRecord(payload);
    if (record?.['status'] !== 'committed') {
        return null;
    }
    return parseVoiceStreamCommittedPayload(payload);
};
const normalizeAudioFormat = (raw)=>{
    const record = asRecord(raw);
    const encoding = record?.['encoding'] === 'pcm_s16le' ? 'pcm_s16le' : VOICE_STREAM_AUDIO_FORMAT.encoding;
    const sampleRateHertz = voice_numberField(record, 'sampleRateHertz') ?? VOICE_STREAM_AUDIO_FORMAT.sampleRateHertz;
    const channels = voice_numberField(record, 'channels') ?? VOICE_STREAM_AUDIO_FORMAT.channels;
    const chunkMs = voice_numberField(record, 'chunkMs') ?? VOICE_STREAM_AUDIO_FORMAT.chunkMs;
    return {
        encoding,
        sampleRateHertz,
        channels,
        chunkMs
    };
};
const asRecord = (value)=>{
    return value && typeof value === 'object' ? value : null;
};
const voice_stringField = (record, key)=>{
    const value = record?.[key];
    return typeof value === 'string' ? value : null;
};
const voice_numberField = (record, key)=>{
    const value = record?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
