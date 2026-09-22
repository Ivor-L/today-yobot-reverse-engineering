// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/file-store/utils.ts.
// The original TypeScript and import graph are not restored.

const readEntryTime = (line)=>{
    try {
        const value = JSON.parse(line);
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return undefined;
        }
        const time = value.time;
        if (typeof time !== 'number' || !Number.isFinite(time)) {
            return undefined;
        }
        return time;
    } catch  {
        return undefined;
    }
};
const resolvePositiveInteger = (value, fallback)=>{
    if (value === undefined || !Number.isFinite(value) || value <= 0) {
        return fallback;
    }
    return Math.max(1, Math.floor(value));
};
const retainNdjson = (source, cutoffTime, maxBytes)=>{
    const sourceLines = source.split('\n');
    const retainedByAge = [];
    let changed = !source.endsWith('\n') && source.length > 0;
    for (const line of sourceLines){
        if (line.length === 0) {
            continue;
        }
        const time = readEntryTime(line);
        if (time === undefined || time < cutoffTime) {
            changed = true;
            continue;
        }
        retainedByAge.push(line);
    }
    const retainedNewestFirst = [];
    let retainedBytes = 0;
    for(let index = retainedByAge.length - 1; index >= 0; index -= 1){
        const line = retainedByAge[index];
        if (line === undefined) {
            continue;
        }
        const lineBytes = Buffer.byteLength(line, 'utf8') + 1;
        if (retainedBytes + lineBytes > maxBytes) {
            changed = true;
            break;
        }
        retainedNewestFirst.push(line);
        retainedBytes += lineBytes;
    }
    const retainedLines = retainedNewestFirst.reverse();
    const contents = retainedLines.length > 0 ? `${retainedLines.join('\n')}\n` : '';
    if (contents !== source) {
        changed = true;
    }
    return {
        contents,
        changed
    };
};
