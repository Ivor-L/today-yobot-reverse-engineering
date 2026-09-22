// Compiled fragment from ../../packages/realtime-contract/src/socket/event-names.ts.
// The original TypeScript and import graph are not restored.

const socketEventNames = {
    notification: {
        deliver: 'notification.deliver'
    },
    cloud: {
        devicesUpdated: 'cloud.devices_updated'
    },
    connectors: {
        changedV1: 'connectors.changed.v1'
    },
    memory: {
        fileChanged: 'memory.file_changed.v1'
    },
    dayInProgress: {
        eventsChangedV1: 'day_in_progress.events.changed.v1'
    },
    profile: {
        changedV1: 'profile.changed.v1'
    },
    rapport: {
        updatedV1: 'rapport.updated.v1'
    },
    pricing: {
        noticesChangedV1: 'pricing.notices.changed.v1',
        statusChangedV1: 'pricing.status.changed.v1'
    },
    task: {
        created: 'task.created',
        started: 'task.started',
        completed: 'task.completed',
        failed: 'task.failed',
        stopped: 'task.stopped',
        recommendations: {
            readyV1: 'task_recommendations.ready.v1'
        },
        plan: {
            pattern: 'task.plan.*',
            prefix: 'task.plan.'
        },
        step: {
            pattern: 'task.step.*',
            prefix: 'task.step.'
        },
        run: {
            toolStarted: 'task.run.tool_started',
            toolCompleted: 'task.run.tool_completed',
            agentTurnCompleted: 'task.run.agent_turn_completed',
            completed: 'task.run.completed',
            failed: 'task.run.failed'
        },
        outputReady: 'task.output.ready'
    },
    automation: {
        created: 'automation.created',
        updated: 'automation.updated',
        deleted: 'automation.deleted'
    },
    chat: {
        messageNew: 'message.new',
        messageReady: 'chat.message_ready',
        messageReadyV2: 'chat.message_ready.v2',
        messageUpdatedV2: 'chat.message_updated.v2',
        presentationUpdatedV1: 'chat.presentation.updated.v1',
        toolStartedV2: 'chat.tool_started.v2',
        toolCompletedV2: 'chat.tool_completed.v2',
        runCompletedV2: 'chat.run_completed.v2',
        runFailedV2: 'chat.run_failed.v2'
    },
    agent: {
        messageChangesAvailableV1: 'agent.message_changes_available.v1'
    },
    agentIndicator: {
        statusV1: 'agent_indicator.status.v1'
    },
    userIndicator: {
        changedV1: 'user_indicator.changed.v1'
    },
    clientLog: {
        upload: {
            requestedV1: 'client_log.upload.requested.v1',
            cancelledV1: 'client_log.upload.cancelled.v1'
        }
    }
};
const taskLifecycleSocketEvents = [
    socketEventNames.task.created,
    socketEventNames.task.started,
    socketEventNames.task.completed,
    socketEventNames.task.failed,
    socketEventNames.task.stopped
];
const automationLifecycleSocketEvents = [
    socketEventNames.automation.created,
    socketEventNames.automation.updated,
    socketEventNames.automation.deleted
];
const taskRunSocketEvents = [
    socketEventNames.task.run.toolStarted,
    socketEventNames.task.run.toolCompleted,
    socketEventNames.task.run.agentTurnCompleted,
    socketEventNames.task.run.completed,
    socketEventNames.task.run.failed
];
const taskRecommendationsSocketEvents = [
    socketEventNames.task.recommendations.readyV1
];
const profileSocketEvents = [
    socketEventNames.profile.changedV1
];
const rapportSocketEvents = [
    socketEventNames.rapport.updatedV1
];
const connectorsSocketEvents = [
    socketEventNames.connectors.changedV1
];
