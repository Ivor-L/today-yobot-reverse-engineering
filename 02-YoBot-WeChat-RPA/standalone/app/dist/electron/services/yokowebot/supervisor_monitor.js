import { EventEmitter } from 'events';
import { RpaSupervisorClient } from '../../skills/wechat_rpa/supervisor_client.js';
function autoReplyState(status) {
    const desired = status.feature_state?.auto_reply?.enabled === true;
    const actual = status.worker_heartbeat?.runtime?.auto_reply?.actual === true;
    return { desired, actual };
}
export class RpaSupervisorMonitor extends EventEmitter {
    client;
    pollIntervalMs;
    timer = null;
    polling = false;
    recovering = false;
    lastNotificationKey = '';
    constructor(client = new RpaSupervisorClient(), pollIntervalMs = 5_000) {
        super();
        this.client = client;
        this.pollIntervalMs = pollIntervalMs;
    }
    start() {
        if (this.timer)
            return;
        void this.poll();
        this.timer = setInterval(() => void this.poll(), this.pollIntervalMs);
    }
    stop() {
        if (this.timer)
            clearInterval(this.timer);
        this.timer = null;
        this.polling = false;
    }
    emitLifecycleAlert(type, status) {
        const eventId = status.last_event_id
            || `supervisor:${type}:${status.worker_generation || 'none'}:${status.reason_code || status.status}`;
        const notificationKey = `${type}:${eventId}`;
        if (notificationKey === this.lastNotificationKey)
            return;
        this.lastNotificationKey = notificationKey;
        const alert = {
            type: 'yokowebot_alert',
            alertType: type,
            eventId: notificationKey,
            correlationId: status.worker_generation || '',
            timestamp: Date.now(),
            event: `rpa.supervisor.${status.status}`,
            context: {
                supervisorPid: status.supervisor_pid,
                workerPid: status.worker_pid,
                workerGeneration: status.worker_generation,
            },
            payload: {
                status: status.status,
                reasonCode: status.reason_code,
                message: status.message,
                restartCount: status.restart_count || 0,
                maxRestarts: status.max_restarts || 0,
                timeoutSeconds: type === 'wechat_manual_action' ? 60 : undefined,
                ...autoReplyState(status),
            },
            actions: [],
        };
        this.emit('alert', alert);
    }
    async poll() {
        if (this.polling)
            return;
        this.polling = true;
        try {
            const status = await this.client.getStatus();
            // Missing plugin and old plugin versions intentionally have no Supervisor.
            if (!status)
                return;
            const recoveryActive = status.status === 'recovering'
                || (status.status === 'degraded' && (status.restart_count || 0) > 0);
            if (recoveryActive) {
                this.recovering = true;
                this.emitLifecycleAlert('rpa_recovering', status);
                return;
            }
            if (status.status === 'failed') {
                this.recovering = false;
                this.emitLifecycleAlert('rpa_recovery_failed', status);
                return;
            }
            if (status.status === 'action_required') {
                this.recovering = false;
                this.emitLifecycleAlert('wechat_manual_action', status);
                return;
            }
            if (this.recovering && (status.status === 'healthy' || status.status === 'idle')) {
                this.recovering = false;
                this.emitLifecycleAlert('rpa_recovered', status);
            }
        }
        finally {
            this.polling = false;
        }
    }
}
