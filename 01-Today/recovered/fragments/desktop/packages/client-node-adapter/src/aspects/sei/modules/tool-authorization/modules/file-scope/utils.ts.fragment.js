// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/tool-authorization/modules/file-scope/utils.ts.
// The original TypeScript and import graph are not restored.

const asObject = (value)=>{
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    return value;
};
const escapePattern = (value)=>value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
const pathPrefixPattern = (value, windows)=>{
    if (!windows) {
        return escapePattern(value);
    }
    return [
        ...value
    ].map((character)=>{
        if (character === '\\' || character === '/') {
            return '[\\\\/]';
        }
        if (/[a-z]/iu.test(character)) {
            return `[${character.toLowerCase()}${character.toUpperCase()}]`;
        }
        return escapePattern(character);
    }).join('');
};
