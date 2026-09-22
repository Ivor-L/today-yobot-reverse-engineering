// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/utils.ts.
// The original TypeScript and import graph are not restored.

const toUserSocketSessionIdentity = (context)=>{
    const { accountId, environment, sessionGeneration } = context;
    return Object.freeze({
        accountId,
        environment,
        sessionGeneration
    });
};
const copySocketState = (state)=>{
    const { error, messageProtocolVersion, registeredDeviceId, status } = state;
    const protocolState = messageProtocolVersion ? {
        messageProtocolVersion
    } : {};
    let deviceState = {};
    if (registeredDeviceId) {
        deviceState = {
            registeredDeviceId
        };
    }
    if (error) {
        return Object.freeze({
            status,
            ...protocolState,
            ...deviceState,
            error: Object.freeze({
                ...error
            })
        });
    }
    return Object.freeze({
        status,
        ...protocolState,
        ...deviceState
    });
};
const REGISTERED_DEVICE_ID_PATTERN = /^d_[A-Za-z0-9_-]{1,255}$/u;
/** Accepts the complete backend nanoid alphabet, including `_` and `-` immediately after `d_`. */ const normalizeRegisteredDeviceId = (value)=>{
    const normalized = value?.trim() ?? '';
    if (!REGISTERED_DEVICE_ID_PATTERN.test(normalized)) {
        return null;
    }
    return normalized;
};
const isSameUserSocketSession = (left, right)=>{
    return left.accountId === right.accountId && left.environment === right.environment && left.sessionGeneration === right.sessionGeneration;
};
const SOCKET_DIAGNOSTIC_TYPES = new Set([
    'classic.start',
    'cloud.hello_ack',
    'cloud.resume_failed',
    'cloud.resume_ok',
    'device.hello',
    'device.resume',
    'socket.auth_retry',
    'socket.close',
    'socket.close_failed',
    'socket.close_watchdog_timeout',
    'socket.connected',
    'socket.error',
    'socket.handshake_protocol_invalid',
    'socket.handshake_timeout',
    'socket.heartbeat_ack_timeout',
    'socket.open',
    'socket.opening',
    'socket.reconnect_scheduled',
    'socket.resume_requested',
    'socket.sequence_buffer_overflow',
    'socket.sequence_gap',
    'socket.sequence_recovery_abandoned',
    'socket.setup_failed',
    'socket.unauthorized',
    'socket.unavailable'
]);
const SOCKET_DIAGNOSTIC_ATTRIBUTE_KEYS = new Set([
    'attempt',
    'bufferSize',
    'code',
    'delayMs',
    'expectedSeq',
    'lastContiguousSeq',
    'lastSeq',
    'maxBufferSize',
    'messageProtocolVersion',
    'missedAcks',
    'phase',
    'receivedSeq',
    'recoveryAttempt',
    'recoveryAttempts',
    'replayedCount',
    'resetSession',
    'seq',
    'timeoutMs',
    'wasClean'
]);
/** Projects the production-safe subset of one raw Socket debug record. */ const toSocketDiagnosticRecord = (event)=>{
    if (!SOCKET_DIAGNOSTIC_TYPES.has(event.type)) {
        return null;
    }
    const attributes = {};
    if (typeof event.payload === 'object' && event.payload !== null && !Array.isArray(event.payload)) {
        for (const [key, value] of Object.entries(event.payload)){
            if (!SOCKET_DIAGNOSTIC_ATTRIBUTE_KEYS.has(key)) {
                continue;
            }
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
                attributes[key] = value;
            }
        }
    }
    return {
        type: event.type,
        timestamp: event.timestamp,
        direction: event.direction,
        ...event.source ? {
            source: event.source
        } : {},
        ...event.socketType ? {
            transport: event.socketType
        } : {},
        attributes
    };
};
