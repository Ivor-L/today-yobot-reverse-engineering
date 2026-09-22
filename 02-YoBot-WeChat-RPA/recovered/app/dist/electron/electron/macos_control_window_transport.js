export function macOSControlWindowOwnsUrl(requestUrl, target) {
    if (!target)
        return false;
    try {
        const requestOrigin = new URL(requestUrl).origin;
        const targetOrigin = new URL(target.apiBaseUrl).origin;
        return requestOrigin === targetOrigin
            && requestOrigin === `http://127.0.0.1:${target.ownership.port}`;
    }
    catch {
        return false;
    }
}
export function macOSControlWindowHeaders(requestUrl, requestHeaders, target) {
    if (!target || !macOSControlWindowOwnsUrl(requestUrl, target))
        return null;
    const headers = { ...requestHeaders };
    for (const key of Object.keys(headers)) {
        if (['x-api-key', 'x-channel-id'].includes(key.toLowerCase()))
            delete headers[key];
    }
    headers['X-API-Key'] = target.credential.read();
    headers['X-Channel-ID'] = target.ownership.channel_id;
    return headers;
}
