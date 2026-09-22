// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/utils.ts.
// The original TypeScript and import graph are not restored.





const toolAuthorizationScopeKey = (scope)=>{
    return (0,external_node_crypto_namespaceObject.createHash)('sha256').update(`${scope.environment}\0${scope.accountId}`).digest('hex');
};
const isValidConnectorId = (id)=>{
    return typeof id === 'string' && id.trim() === id && id.length > 0 && id.length <= (/* inlined export .MAX_CONNECTOR_ID_LENGTH */100);
};
const fileConnectorIds = (platform)=>{
    return Object.values(base_ToolFileRoot).map((root)=>`${platform}_${root}`);
};
const isCurrentPlatformConnector = (id, platform)=>{
    if (isDesktopConnectorId(id)) {
        return DESKTOP_CONNECTOR_CAPABILITIES[id].platform === platform;
    }
    for (const candidate of Object.values(cpi_SystemPlatform)){
        if (candidate !== platform && fileConnectorIds(candidate).includes(id)) {
            return false;
        }
    }
    return true;
};
