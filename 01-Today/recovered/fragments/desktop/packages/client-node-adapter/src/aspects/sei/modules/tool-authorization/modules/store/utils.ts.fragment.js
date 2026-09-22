// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.




const utils_object = (value)=>value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
const utils_strings = (value)=>Array.isArray(value) && value.every((id)=>typeof id === 'string' && id.trim() === id && id.length > 0);
const parseAuthorizationState = (value)=>{
    const state = utils_object(value);
    if (!state || typeof state.committed !== 'boolean' || !Array.isArray(state.connectorIds) || !state.connectorIds.every(isValidConnectorId) || new Set(state.connectorIds).size > (/* inlined export .MAX_KNOWN_CONNECTOR_IDS */256) || !utils_strings(state.excludedToolIds) || !Array.isArray(state.fileRoots) || !state.fileRoots.every((root)=>Object.values(base_ToolFileRoot).includes(root))) {
        return null;
    }
    return Object.freeze({
        connectorIds: Object.freeze([
            ...new Set(state.connectorIds)
        ]),
        excludedToolIds: Object.freeze([
            ...new Set(state.excludedToolIds)
        ]),
        fileRoots: Object.freeze([
            ...new Set(state.fileRoots)
        ]),
        committed: state.committed
    });
};
const parseToolAuthorization = (value)=>{
    const record = utils_object(value);
    if (!record || record.version !== 2) {
        return null;
    }
    const authorization = parseAuthorizationState(record.authorization);
    const effective = record.effectiveAuthorization === null ? null : parseAuthorizationState(record.effectiveAuthorization);
    const known = record.knownConnectorIds;
    const revision = record.revision;
    const syncedRevision = record.syncedRevision;
    if (!authorization || record.effectiveAuthorization !== null && !effective?.committed || authorization.committed && !effective || !Array.isArray(known) || !known.every(isValidConnectorId) || new Set([
        ...known,
        ...authorization.connectorIds
    ]).size > (/* inlined export .MAX_KNOWN_CONNECTOR_IDS */256) || typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1 || typeof syncedRevision !== 'number' || !Number.isSafeInteger(syncedRevision) || syncedRevision < 0 || syncedRevision > revision) {
        return null;
    }
    return Object.freeze({
        authorization,
        effectiveAuthorization: authorization.committed ? authorization : effective,
        knownConnectorIds: Object.freeze([
            ...new Set([
                ...known,
                ...authorization.connectorIds
            ])
        ]),
        revision,
        syncedRevision
    });
};
const parseLegacyAuthorization = (value)=>{
    const record = utils_object(value);
    const state = utils_object(record?.authorization);
    if (!record || record.version !== 1 || !state || !utils_strings(state.toolIds)) {
        return null;
    }
    const parsed = parseAuthorizationState({
        ...state,
        excludedToolIds: []
    });
    if (!parsed) {
        return null;
    }
    return {
        committed: parsed.committed,
        connectorIds: parsed.connectorIds,
        fileRoots: parsed.fileRoots,
        toolIds: state.toolIds
    };
};
