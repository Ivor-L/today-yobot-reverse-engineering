// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/socket/modules/notifications/modules/delivery/utils.ts.
// The original TypeScript and import graph are not restored.


const utils_nonEmptyString = (value)=>{
    if (!lodash_es_isString(value) || value.length === 0) {
        return undefined;
    }
    return value;
};
const parseDeliverNotification = (message)=>{
    const { data, threadId } = message.payload;
    if (!lodash_es_isPlainObject(data)) {
        return null;
    }
    const record = data;
    const notificationId = utils_nonEmptyString(record['notificationId']);
    const type = utils_nonEmptyString(record['type']);
    if (!notificationId || !type) {
        return null;
    }
    const badgeValue = record['badge'];
    const badge = lodash_es_isNumber(badgeValue) && lodash_es_isFinite(badgeValue) && badgeValue >= 0 ? badgeValue : undefined;
    const extraData = record['extraData'];
    const extraDataRecord = lodash_es_isPlainObject(extraData) ? extraData : undefined;
    const messageId = extraDataRecord ? utils_nonEmptyString(extraDataRecord['messageId']) : undefined;
    const title = utils_nonEmptyString(record['title']);
    const subtitle = utils_nonEmptyString(record['subtitle']);
    const body = utils_nonEmptyString(record['body']);
    const sound = utils_nonEmptyString(record['sound']);
    const normalizedThreadId = utils_nonEmptyString(threadId);
    return {
        notificationId,
        type,
        ...badge === undefined ? {} : {
            badge
        },
        ...title === undefined ? {} : {
            title
        },
        ...subtitle === undefined ? {} : {
            subtitle
        },
        ...body === undefined ? {} : {
            body
        },
        ...sound === undefined ? {} : {
            sound
        },
        ...messageId === undefined ? {} : {
            messageId
        },
        ...normalizedThreadId === undefined ? {} : {
            threadId: normalizedThreadId
        }
    };
};
