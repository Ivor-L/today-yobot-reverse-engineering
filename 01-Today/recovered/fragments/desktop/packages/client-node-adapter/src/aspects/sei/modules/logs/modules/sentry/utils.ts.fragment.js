// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/sentry/utils.ts.
// The original TypeScript and import graph are not restored.


const stringifyAttribute = (value)=>{
    try {
        return JSON.stringify(value) ?? '[unserializable]';
    } catch  {
        return '[unserializable]';
    }
};
const toSentryLogAttribute = (value)=>{
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        return value;
    }
    return stringifyAttribute(value);
};
const resolveSentryLogMethod = (level)=>{
    if (level === base_LogLevel.Error) {
        return 'error';
    }
    if (level === base_LogLevel.Warning) {
        return 'warn';
    }
    if (level === base_LogLevel.Info) {
        return 'info';
    }
    return 'debug';
};
const resolveSentryEnvironment = (environment)=>{
    if (environment === base_RuntimeEnvironment.Production) {
        return 'production';
    }
    return environment;
};
const toSentryLogAttributes = (entry)=>{
    const attributes = {
        app_version: entry.app_version,
        layer: entry.layer,
        level: entry.level,
        log_id: entry.id,
        platform: entry.platform,
        runtime_environment: entry.runtime_environment,
        time: entry.time
    };
    if (entry.device_id) {
        attributes.device_id = entry.device_id;
    }
    if (entry.user_id) {
        attributes.user_id = entry.user_id;
    }
    for (const [key, value] of Object.entries(entry.payload ?? {})){
        attributes[`payload.${key}`] = toSentryLogAttribute(value);
    }
    return attributes;
};
const toSentryIssueEvent = (entry)=>({
        message: entry.id,
        level: entry.level === base_LogLevel.Log ? 'debug' : entry.level,
        timestamp: entry.time / 1000,
        fingerprint: [
            'logs',
            entry.platform,
            entry.layer,
            entry.id
        ],
        tags: {
            log_id: entry.id,
            layer: entry.layer,
            platform: entry.platform,
            runtime_environment: entry.runtime_environment,
            app_version: entry.app_version
        },
        contexts: {
            logs: toSentryLogAttributes(entry)
        }
    });
