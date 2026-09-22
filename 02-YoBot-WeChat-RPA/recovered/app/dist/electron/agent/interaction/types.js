export const INTERACTION_SCHEMA_VERSION = 1;
export function toPublicInteraction(request) {
    const { continuation: _continuation, ...publicRequest } = request;
    return structuredClone(publicRequest);
}
