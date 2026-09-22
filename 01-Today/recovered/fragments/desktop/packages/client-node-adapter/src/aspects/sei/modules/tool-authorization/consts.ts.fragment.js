// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/consts.ts.
// The original TypeScript and import graph are not restored.

const EMPTY_TOOL_AUTHORIZATION = Object.freeze({
    connectorIds: Object.freeze([]),
    excludedToolIds: Object.freeze([]),
    fileRoots: Object.freeze([]),
    committed: false
});
const EMPTY_TOOL_AUTHORIZATION_RECORD = Object.freeze({
    authorization: EMPTY_TOOL_AUTHORIZATION,
    effectiveAuthorization: null,
    knownConnectorIds: Object.freeze([]),
    revision: 0,
    syncedRevision: 0
});
const MAX_CONNECTOR_ID_LENGTH = 100;
const MAX_KNOWN_CONNECTOR_IDS = 256;
