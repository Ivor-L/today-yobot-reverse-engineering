// Compiled fragment from ../../packages/client-node-adapter/src/aspects/sei/modules/logs/modules/posthog/utils.ts.
// The original TypeScript and import graph are not restored.

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const toPostHogLogsContext = (entry)=>({
        app_version: entry.app_version,
        ...entry.device_id === undefined ? {} : {
            device_id: entry.device_id
        },
        layer: entry.layer,
        level: entry.level,
        platform: entry.platform,
        runtime_environment: entry.runtime_environment,
        time: entry.time,
        ...entry.user_id === undefined ? {} : {
            user_id: entry.user_id
        }
    });
const toPostHogProperties = (entry)=>{
    const logsContext = toPostHogLogsContext(entry);
    return {
        ...logsContext,
        ...entry.payload,
        logs_context: logsContext,
        $process_person_profile: false
    };
};
const toPostHogEventMetadata = (entry)=>{
    const eventId = entry.payload?.['eid'];
    const eventTimestamp = entry.payload?.['ts'];
    const timestamp = typeof eventTimestamp === 'string' ? new Date(eventTimestamp) : undefined;
    const uuid = typeof eventId === 'string' && UUID_PATTERN.test(eventId) ? eventId : undefined;
    return {
        ...timestamp === undefined || Number.isNaN(timestamp.getTime()) ? {} : {
            timestamp
        },
        ...uuid === undefined ? {} : {
            uuid
        }
    };
};
