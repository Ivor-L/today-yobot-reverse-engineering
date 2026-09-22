// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/debug/modules/tools/modules/calls/utils.ts.
// The original TypeScript and import graph are not restored.



const isDebugToolObject = (value)=>typeof value === 'object' && value !== null && !Array.isArray(value);
const debugToolRequestKey = (value)=>{
    if (typeof value !== 'string' && typeof value !== 'number') {
        return undefined;
    }
    if (typeof value === 'string' && !isDebugToolIdentifier(value)) {
        return undefined;
    }
    return `${typeof value}:${JSON.stringify(value)}`;
};
const isDebugToolIdentifier = (value)=>typeof value === 'string' && value.length > 0 && value.length <= (/* inlined export .MAX_DEBUG_TOOL_IDENTIFIER_LENGTH */2048);
const snapshotDebugToolValue = (value)=>{
    try {
        const serialized = JSON.stringify(value);
        if (serialized !== undefined && Buffer.byteLength(serialized) <= (/* inlined export .MAX_DEBUG_TOOL_VALUE_BYTES */131072)) {
            return {
                value: JSON.parse(serialized),
                truncated: false
            };
        }
    } catch  {
    // A debug projection must not throw back into the tool execution path.
    }
    return {
        value: OMITTED_DEBUG_TOOL_VALUE,
        truncated: true
    };
};
const readDebugToolTaskSummary = (value)=>{
    if (!isDebugToolObject(value) || !isDebugToolIdentifier(value.taskId) || !isDebugToolIdentifier(value.toolId) || typeof value.startedAt !== 'number' || !Number.isFinite(value.startedAt) || value.finishedAt !== undefined && (typeof value.finishedAt !== 'number' || !Number.isFinite(value.finishedAt)) || !Object.values(base_ToolTaskState).includes(value.state)) {
        return undefined;
    }
    return {
        taskId: value.taskId,
        toolId: value.toolId,
        state: value.state,
        startedAt: value.startedAt,
        ...typeof value.finishedAt === 'number' ? {
            finishedAt: value.finishedAt
        } : {}
    };
};
