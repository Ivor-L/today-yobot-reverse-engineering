// Compiled fragment from ./src/app/modules/request-language/utils.ts.
// The original TypeScript and import graph are not restored.

const utils_normalizeLanguage = (value)=>{
    if (!value) {
        return undefined;
    }
    try {
        return Intl.getCanonicalLocales(decodeURIComponent(value).trim())[0];
    } catch  {
        return undefined;
    }
};
