export function resolveMessageSession(adapterName, msg) {
    let channel = adapterName;
    let localSessionId = String(msg.metadata?.chat_id || msg.senderId || "");
    let storageChannel = adapterName;
    let storageId = String(msg.senderId || localSessionId);
    if (adapterName === "websocket" && localSessionId.includes("__")) {
        const parts = localSessionId.split("__");
        channel = parts[0];
        localSessionId = parts.slice(1).join("__");
        storageChannel = channel;
        storageId = localSessionId;
    }
    return {
        adapterName,
        channel,
        localSessionId,
        storageChannel,
        storageId,
        unifiedSessionId: `${storageChannel}__${storageId}`,
        deliveryTarget: String(msg.metadata?.chat_id || localSessionId || storageId),
    };
}
export function resolveRequestedSession(adapterName, sessionId) {
    const raw = String(sessionId || "");
    if (raw.includes("__")) {
        const parts = raw.split("__");
        const channel = parts[0];
        const localSessionId = parts.slice(1).join("__");
        return {
            adapterName,
            channel,
            localSessionId,
            storageChannel: channel,
            storageId: localSessionId,
            unifiedSessionId: raw,
            deliveryTarget: raw,
        };
    }
    return {
        adapterName,
        channel: adapterName,
        localSessionId: raw,
        storageChannel: adapterName,
        storageId: raw,
        unifiedSessionId: `${adapterName}__${raw}`,
        deliveryTarget: raw,
    };
}
