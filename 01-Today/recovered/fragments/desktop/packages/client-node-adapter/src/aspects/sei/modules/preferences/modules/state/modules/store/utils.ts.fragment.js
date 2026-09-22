// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/preferences/modules/state/modules/store/utils.ts.
// The original TypeScript and import graph are not restored.




const isEnvironment = (value)=>value === base_RuntimeEnvironment.Development || value === base_RuntimeEnvironment.Staging || value === base_RuntimeEnvironment.Production;
const isFileNotFoundError = (error)=>error instanceof Error && 'code' in error && error.code === 'ENOENT';
const parsePersistedPreferences = (value, defaultEnvironment)=>{
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return {
            environment: defaultEnvironment
        };
    }
    let environment = defaultEnvironment;
    if ('environment' in value && isEnvironment(value.environment)) {
        environment = value.environment;
    }
    let trafficLanes = {};
    if ('trafficLanes' in value && typeof value.trafficLanes === 'object' && value.trafficLanes !== null && !Array.isArray(value.trafficLanes)) {
        trafficLanes = Object.fromEntries(Object.entries(value.trafficLanes).filter((entry)=>isEnvironment(entry[0]) && typeof entry[1] === 'string' && TRAFFIC_LANE_PATTERN.test(entry[1])));
    }
    // 只持久化 true：false 是默认值，落盘只会让 settings.json 积灰。
    const preventSleepWhileRunning = 'preventSleepWhileRunning' in value && value.preventSleepWhileRunning === true;
    // 只持久化 false：true 是默认值，理由同上。
    const messageNotificationsDisabled = 'messageNotificationsEnabled' in value && value.messageNotificationsEnabled === false;
    let parsed = {
        environment
    };
    if (!lodash_es_isEmpty(trafficLanes)) {
        parsed = {
            ...parsed,
            trafficLanes
        };
    }
    if (preventSleepWhileRunning) {
        parsed = {
            ...parsed,
            preventSleepWhileRunning
        };
    }
    if (messageNotificationsDisabled) {
        parsed = {
            ...parsed,
            messageNotificationsEnabled: false
        };
    }
    if ('meetingDetectionEnabled' in value && value.meetingDetectionEnabled === false) {
        parsed = {
            ...parsed,
            meetingDetectionEnabled: false
        };
    }
    return parsed;
};
