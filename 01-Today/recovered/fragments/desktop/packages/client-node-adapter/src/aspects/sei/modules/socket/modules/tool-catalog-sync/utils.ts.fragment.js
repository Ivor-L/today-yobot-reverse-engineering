// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/tool-catalog-sync/utils.ts.
// The original TypeScript and import graph are not restored.



const sortJsonObjectKeys = (_key, value)=>{
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return value;
    }
    const record = value;
    return Object.fromEntries(Object.keys(record).sort().map((key)=>[
            key,
            record[key]
        ]));
};
const createToolCatalogSyncKey = (params, catalog)=>{
    const snapshot = JSON.stringify({
        accountId: params.accountId,
        environment: params.environment,
        sessionGeneration: params.sessionGeneration,
        apiBaseUrl: params.apiBaseUrl.replace(/\/+$/u, ''),
        deviceId: params.deviceId,
        trafficLane: params.trafficLane,
        appVersion: params.appVersion,
        clientPlatform: params.clientPlatform,
        revision: catalog.revision,
        // Include Native availability, which is not carried in the server manifest.
        registrations: catalog.registrations,
        connectors: catalog.connectorSnapshot.connectors
    }, sortJsonObjectKeys);
    return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(snapshot).digest('hex');
};
const toManifestEntry = (registration)=>{
    const { description, enabled, id, inputSchema, outputSchema, parent, riskLevel, version } = registration;
    return {
        capabilityId: id,
        description,
        enabled,
        executorType: DEVICE_TOOL_EXECUTOR_TYPE,
        inputSchema,
        outputSchema,
        ...parent === undefined ? {} : {
            parent
        },
        riskLevel,
        version
    };
};
