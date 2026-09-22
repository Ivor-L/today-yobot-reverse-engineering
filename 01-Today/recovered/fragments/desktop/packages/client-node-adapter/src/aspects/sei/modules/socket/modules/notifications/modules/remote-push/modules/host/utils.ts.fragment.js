// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/remote-push/modules/host/utils.ts.
// The original TypeScript and import graph are not restored.


const normalizeRemotePushNotification = (payload)=>{
    const notificationIdValue = payload['notification_id'];
    const notificationId = lodash_es_isString(notificationIdValue) && notificationIdValue.length > 0 ? notificationIdValue : undefined;
    return Object.freeze({
        ...notificationId === undefined ? {} : {
            notificationId
        }
    });
};
