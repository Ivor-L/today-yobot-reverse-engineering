// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/account/modules/request-language/utils.ts.
// The original TypeScript and import graph are not restored.

const normalizeLanguage = (value)=>{
    if (!value) {
        return undefined;
    }
    try {
        return Intl.getCanonicalLocales(decodeURIComponent(value).trim())[0];
    } catch  {
        return undefined;
    }
};
