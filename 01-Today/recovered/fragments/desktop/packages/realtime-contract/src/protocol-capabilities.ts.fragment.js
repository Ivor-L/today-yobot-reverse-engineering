// Compiled fragment from ../../packages/realtime-contract/src/protocol-capabilities.ts.
// The original TypeScript and import graph are not restored.


const CANONICAL_MESSAGE_PROTOCOL_VERSION = 'canonical-v1';
const identifierSchema = schemas_string().min(1);
const canonicalMessageCapabilitiesSchema = schemas_object({
    messageProtocolVersion: literal(CANONICAL_MESSAGE_PROTOCOL_VERSION),
    authSubject: identifierSchema.optional(),
    mainConversationId: identifierSchema.optional(),
    supportsTypedBody: literal(true),
    supportsSequencePull: literal(true),
    supportsLongPoll: schemas_boolean(),
    longPollWaitMaxMs: schemas_number().int().min(0).max(25000),
    supportsAtomicCardContinuation: schemas_boolean()
}).passthrough();
const canonicalFileCapabilitiesSchema = schemas_object({
    linkProtocolVersion: literal('file-links-v1'),
    supportedLinkTypes: tuple([
        literal('public_share')
    ])
}).passthrough();
const unavailableProtocolCapabilitiesDataSchema = schemas_object({
    architecture: literal('unavailable')
}).passthrough();
const canonicalProtocolCapabilitiesDataSchema = schemas_object({
    architecture: literal('canonical'),
    messageCapabilities: canonicalMessageCapabilitiesSchema,
    fileCapabilities: canonicalFileCapabilitiesSchema.optional()
}).passthrough();
/** review-40 过渡接口的统一响应；只有 canonical 分支允许启用新 Message wire。 */ const protocolCapabilitiesEnvelopeSchema = schemas_object({
    success: literal(true),
    data: discriminatedUnion('architecture', [
        canonicalProtocolCapabilitiesDataSchema,
        unavailableProtocolCapabilitiesDataSchema
    ])
}).passthrough();
