// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/device-connector-sync/modules/backend/utils.ts.
// The original TypeScript and import graph are not restored.

const readCount = (value)=>{
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    return 0;
};
/**
 * 服务端 envelope `{ success, code, data: { upserted, deleted, unchanged } }`（契约 §10）。
 * 与 iOS `ResponseModel<DeviceConnectorSyncResultModel>` 同一口径：`success` / `code` 缺失即非法 envelope；
 * 计数缺失按 0，只作诊断。
 */ const utils_parseEnvelope = (text)=>{
    let payload;
    try {
        payload = JSON.parse(text);
    } catch  {
        return undefined;
    }
    if (payload === null || typeof payload !== 'object') {
        return undefined;
    }
    const record = payload;
    if (typeof record.success !== 'boolean' || typeof record.code !== 'string') {
        return undefined;
    }
    const data = record.data !== null && typeof record.data === 'object' ? record.data : undefined;
    return {
        success: record.success,
        code: record.code,
        counts: data ? {
            upserted: readCount(data.upserted),
            deleted: readCount(data.deleted),
            unchanged: readCount(data.unchanged)
        } : undefined
    };
};
