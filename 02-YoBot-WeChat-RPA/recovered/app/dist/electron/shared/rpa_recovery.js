/** Pending connection is normal; the repair label requires an actual repair action. */
export function rpaConnectionCopy(state) {
    if (state === 'repairing')
        return { title: '正在修复微信 BOT', detail: '完成后将自动连接，你可以先使用其他功能。' };
    if (state === 'updating')
        return { title: '正在更新微信 BOT', detail: '更新完成后将自动连接。' };
    return { title: '正在连接微信 BOT', detail: '连接完成后即可使用，请稍候。' };
}
export function rpaRecoveryCopy(reason) {
    if (reason === 'client_update_required')
        return {
            title: '请先更新客户端', detail: '完成客户端更新后，即可重新连接微信 BOT。', action: '前往设置',
        };
    if (reason === 'permission_denied')
        return {
            title: '需要重启电脑', detail: '系统权限限制了旧版微信 BOT 的自动清理。请保存工作，重启电脑后打开客户端。', action: '重新检查',
        };
    if (reason === 'cleanup_failed')
        return {
            title: '需要重启电脑', detail: '微信 BOT 未能正常退出。请保存工作，重启电脑后打开客户端。', action: '重新检查',
        };
    if (reason === 'version_mismatch' || reason === 'update_failed')
        return {
            title: '更新尚未完成', detail: '微信 BOT 更新未能生效。请重启电脑后打开客户端，若仍未恢复，请重新安装插件。', action: '重新检查',
        };
    return {
        title: '微信 BOT 暂时无法连接', detail: '请先重新检查。若仍无法连接，请保存工作，重启电脑后打开客户端。', action: '重新检查',
    };
}
export const RPA_TRANSPORT_RECOVERY_REASON_CODES = new Set([
    'WORKER_HEALTH_INCOMPLETE',
    'WORKER_RESTARTING',
    'MANUAL_RESTART_REQUESTED',
    'WORKER_EXITED',
    'WORKER_UNRESPONSIVE',
    'WORKER_HTTP_UNRESPONSIVE',
    'WORKER_HEARTBEAT_STALE',
    'WORKER_SEMANTIC_STALL',
]);
/**
 * Classify live-Worker business conditions without treating unfamiliar business codes
 * as transport failure. This classification is not a health proof: callers still check
 * Worker identity/HTTP. main.py may restart unhealthy semantic tasks after confirmation;
 * restoration, maintenance and session-lock degradation itself does not request a restart.
 */
export function isRpaBusinessDegradation(status) {
    if (!status)
        return false;
    if (status.status !== 'degraded' && status.status !== 'recovering')
        return false;
    if (!status.reason_code)
        return false;
    if (RPA_TRANSPORT_RECOVERY_REASON_CODES.has(status.reason_code))
        return false;
    return status.worker_running !== false;
}
/** Mirrors main.py: initial spawn is starting; scheduled respawn is recovering.
 * Business restoration/maintenance on a live Worker does not own the page. */
export function getRpaSupervisorTransition(status) {
    if (!status)
        return null;
    if (status.status === 'starting' || status.status === 'stopping')
        return 'waiting';
    if (status.status === 'recovering' && !isRpaBusinessDegradation(status))
        return 'repairing';
    if (status.status === 'degraded' && status.reason_code === 'WORKER_HEALTH_INCOMPLETE')
        return 'waiting';
    return null;
}
