// Compiled fragment from ./src/app/modules/node-network-inspection/modules/compatibility/utils.ts.
// The original TypeScript and import graph are not restored.



const utils_asRecord = (value)=>{
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return undefined;
    }
    return value;
};
/** Node requires a charset to expose cached request bytes through getRequestPostData. */ const normalizeInspectorNetworkRequestEvent = (event)=>{
    const source = utils_asRecord(event);
    if (!source || source['charset'] !== undefined && source['charset'] !== '') {
        return event;
    }
    const request = utils_asRecord(source['request']);
    const headers = utils_asRecord(request?.['headers']);
    const contentType = headers && Object.entries(headers).find(([name])=>name.toLowerCase() === 'content-type')?.[1];
    if (typeof contentType !== 'string') {
        return event;
    }
    let mimeType;
    try {
        mimeType = new external_node_util_namespaceObject.MIMEType(contentType);
    } catch  {
        return event;
    }
    if (mimeType.params.has('charset') || mimeType.essence !== 'application/json' && !mimeType.subtype.endsWith('+json')) {
        return event;
    }
    // Correct only inspector metadata; preserve the transport's original headers and bytes.
    return {
        ...source,
        charset: 'utf-8'
    };
};
const isValidByteLength = (value)=>typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const normalizeInspectorNetworkData = (value)=>{
    if (ArrayBuffer.isView(value)) {
        return value;
    }
    if (value instanceof ArrayBuffer) {
        return external_node_buffer_namespaceObject.Buffer.from(value);
    }
    return undefined;
};
const normalizeInspectorNetworkDataReceivedEvent = (event)=>{
    if (!event || typeof event !== 'object') {
        return event;
    }
    const source = event;
    if (typeof source.data === 'string') {
        const data = external_node_buffer_namespaceObject.Buffer.from(source.data);
        return {
            ...source,
            data,
            dataLength: data.byteLength,
            encodedDataLength: data.byteLength
        };
    }
    const data = normalizeInspectorNetworkData(source.data);
    if (!data) {
        return event;
    }
    const dataLength = isValidByteLength(source.dataLength) ? source.dataLength : data.byteLength;
    const encodedDataLength = isValidByteLength(source.encodedDataLength) ? source.encodedDataLength : data.byteLength;
    if (data === source.data && dataLength === source.dataLength && encodedDataLength === source.encodedDataLength) {
        return event;
    }
    return {
        ...source,
        data,
        dataLength,
        encodedDataLength
    };
};
