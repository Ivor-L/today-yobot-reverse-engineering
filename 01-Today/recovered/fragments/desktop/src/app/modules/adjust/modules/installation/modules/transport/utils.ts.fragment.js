// Compiled fragment from ./src/app/modules/adjust/modules/installation/modules/transport/utils.ts.
// The original TypeScript and import graph are not restored.


const readDesktopAdjustErrorCode = (responseText)=>{
    try {
        const value = JSON.parse(responseText);
        if (adjust_utils_isRecord(value) && typeof value['code'] === 'string') {
            return value['code'];
        }
    } catch  {
    // Status remains authoritative when the optional error envelope is invalid.
    }
    return undefined;
};
