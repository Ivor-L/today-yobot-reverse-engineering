// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/http-client/modules/error-mapper/utils.ts.
// The original TypeScript and import graph are not restored.



const readRegistrationRestrictionMessage = async (response, reader)=>{
    try {
        const text = await reader.readText(response.clone());
        try {
            return getSafeRegistrationRestrictionMessage(JSON.parse(text));
        } catch  {
            return getSafeRegistrationRestrictionMessage(text);
        }
    } catch  {
        return null;
    }
};
const readRetryAfterMs = (response, now = Date.now())=>{
    const value = response.headers.get('Retry-After') ?? response.headers.get('X-Retry-After');
    if (!value) {
        return undefined;
    }
    const seconds = Number(value);
    if (lodash_es_isFinite(seconds) && seconds >= 0) {
        return Math.floor(seconds * 1000);
    }
    const date = Date.parse(value);
    if (!lodash_es_isFinite(date)) {
        return undefined;
    }
    return Math.max(0, date - now);
};
