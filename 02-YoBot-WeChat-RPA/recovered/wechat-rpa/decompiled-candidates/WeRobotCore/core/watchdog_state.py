# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: watchdog_state.marshal (Python 3.9)

'''RPA watchdog persistent state and lightweight worker telemetry.

This module is intentionally stdlib-only (apart from DataManager) so it can be
imported by both the supervisor process and the RPA worker without importing UIA
or the FastAPI application.
'''
from __future__ import annotations
import json
import logging
import os
import threading
import time
import uuid
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Iterable, Optional
from WeRobotCore.utils.data_manager import DataManager
SCHEMA_VERSION = 1
FEATURE_STATE_FILE = 'feature_state.json'
WATCHDOG_STATUS_FILE = 'watchdog_status.json'
RECOVERY_HISTORY_FILE = 'recovery_history.jsonl'
_io_lock = threading.RLock()
_runtime_lock = threading.RLock()
_watchdog_logger: 'Optional[logging.Logger]' = None
_diagnostic_logger: 'Optional[logging.Logger]' = None
_monitor_health: 'Dict[str, Dict[str, Any]]' = { }
_uia_health: 'Dict[str, Dict[str, Any]]' = { }
_wechat_health: 'Dict[str, Dict[str, Any]]' = { }
_runtime_phase: 'Dict[str, Any]' = {
    'status': 'idle',
    'reason_code': None,
    'message': '',
    'updated_at': 0 }

def _now_iso():
    tz = timezone(timedelta(8, **('hours',)))
    return datetime.now(tz).isoformat('seconds', **('timespec',))


def get_runtime_dir():
    override = os.environ.get('WEBOT_RUNTIME_DIR')
    path = Path(override) if override else Path(DataManager.get_data_dir_str()) / 'runtime'
    path.mkdir(True, True, **('parents', 'exist_ok'))
    return path


def get_watchdog_log_dir():
    override = os.environ.get('WEBOT_LOG_DIR')
    path = Path(override) if override else Path(DataManager.get_data_dir_str()).parent / 'logs'
    path.mkdir(True, True, **('parents', 'exist_ok'))
    return path


def _read_json(path = None):
    pass
# WARNING: Decompyle incomplete


def _atomic_write_json(path = None, payload = None):
    path.parent.mkdir(True, True, **('parents', 'exist_ok'))
    tmp_path = path.with_name(f'''{path.name}.{os.getpid()}.{threading.get_ident()}.tmp''')
# WARNING: Decompyle incomplete


def _default_feature_state():
    return {
        'schema_version': SCHEMA_VERSION,
        'auto_reply': {
            'enabled': False,
            'reply_mode': 'local',
            'account_ids': [],
            'updated_at': None,
            'source': 'default' } }


def load_feature_state():
    path = get_runtime_dir() / FEATURE_STATE_FILE
    data = _read_json(path)
    default = _default_feature_state()
    auto_reply = data.get('auto_reply') if isinstance(data.get('auto_reply'), dict) else { }
    reply_mode = auto_reply.get('reply_mode')
    account_ids = auto_reply.get('account_ids')
    if not account_ids:
        pass
    if not auto_reply.get('source'):
        pass
    default['auto_reply'].update({
        'enabled': bool(auto_reply.get('enabled', False)),
        'reply_mode': reply_mode if reply_mode in frozenset({'agent', 'local'}) else 'local',
        'account_ids': sorted((lambda .0: pass# WARNING: Decompyle incomplete
)([])),
        'updated_at': auto_reply.get('updated_at'),
        'source': str('unknown') })
    return default


def save_auto_reply_intent(enabled = None, reply_mode = None, account_ids = None, source = ('local', None, 'api')):
    current = load_feature_state()
    if not current.get('auto_reply'):
        pass
    previous = { }
    if account_ids is not None:
        pass
    elif not previous.get('account_ids'):
        pass
    normalized_accounts = account_ids(previous.get('account_ids')([]))
    payload = {
        'schema_version': SCHEMA_VERSION,
        'auto_reply': {
            'enabled': bool(enabled),
            'reply_mode': reply_mode if reply_mode in frozenset({'agent', 'local'}) else 'local',
            'account_ids': normalized_accounts,
            'updated_at': _now_iso(),
            'source': source } }
    with _io_lock:
        _atomic_write_json(get_runtime_dir() / FEATURE_STATE_FILE, payload)
        (lambda .0: pass# WARNING: Decompyle incomplete
)(None, None, None)
    with None:
        if not sorted:
            pass
    record_diagnostic_event('AUTO_REPLY_INTENT_SAVED', bool(enabled), payload['auto_reply']['reply_mode'], normalized_accounts, source, **('enabled', 'reply_mode', 'accounts', 'source'))
    return payload


def read_watchdog_status():
    return _read_json(get_runtime_dir() / WATCHDOG_STATUS_FILE)


def write_watchdog_status(payload = None):
    if not payload:
        pass
    value = dict({ })
    value.setdefault('schema_version', SCHEMA_VERSION)
    value['updated_at'] = _now_iso()
    value['timestamp'] = time.time()
    with _io_lock:
        _atomic_write_json(get_runtime_dir() / WATCHDOG_STATUS_FILE, value)
        None(None, None, None)
    with None:
        if not None:
            pass
    return value


def append_watchdog_event(event_type = None, **details):
    pass
# WARNING: Decompyle incomplete


def get_watchdog_logger():
    global _watchdog_logger
    if _watchdog_logger is not None:
        return _watchdog_logger
    with None:
        if _watchdog_logger is not None:
            pass
        None(None, None, None)
        return None
        logger = logging.getLogger('RPAWatchdog')
        logger.setLevel(logging.INFO)
        logger.propagate = False
        if not logger.handlers:
            handler = RotatingFileHandler(get_watchdog_log_dir() / 'watchdog.log', 5242880, 3, 'utf-8', **('maxBytes', 'backupCount', 'encoding'))
            handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
            logger.addHandler(handler)
        _watchdog_logger = logger
        None(None, None, None)
        return logger
        with None:
            if not None:
                pass


def get_diagnostic_logger():
    '''Return the RPA-owned persistent diagnostic logger.

    Unlike the historical UIA log, this file lives under the shared Webot data
    directory.  It therefore survives replacing/deleting the packaged plugin
    and does not depend on an Agent version forwarding worker stdout.
    '''
    global _diagnostic_logger
    if _diagnostic_logger is not None:
        return _diagnostic_logger
    with None:
        if _diagnostic_logger is not None:
            pass
        None(None, None, None)
        return None
        logger = logging.getLogger('RPADiagnostics')
        logger.setLevel(logging.INFO)
        logger.propagate = False
        if not logger.handlers:
            handler = RotatingFileHandler(get_watchdog_log_dir() / 'rpa_diagnostics.log', 10485760, 5, 'utf-8', **('maxBytes', 'backupCount', 'encoding'))
            handler.setFormatter(logging.Formatter('%(message)s'))
            logger.addHandler(handler)
        _diagnostic_logger = logger
        None(None, None, None)
        return logger
        with None:
            if not None:
                pass


def record_diagnostic_event(event_type = None, level = None, **details):
    '''Write one structured diagnostic event without affecting business flow.'''
    pass
# WARNING: Decompyle incomplete


def set_runtime_phase(status = None, reason_code = None, message = None):
    changed = False
    with _runtime_lock:
        if not _runtime_phase.get('status') != status:
            pass
        changed = _runtime_phase.get('reason_code') != reason_code
        _runtime_phase.update({
            'status': status,
            'reason_code': reason_code,
            'message': message,
            'updated_at': time.time() })
        None(None, None, None)
    with None:
        if not None:
            pass
    if changed:
        if not message:
            pass
        record_diagnostic_event('RUNTIME_PHASE_CHANGED', status, reason_code, str('')[:500], **('status', 'reason_code', 'message'))


def record_monitor_cycle_started(account_id = None):
    if not account_id:
        return None
    now = None.time()
    with _runtime_lock:
        state = _monitor_health.setdefault(account_id, { })
        state.update({
            'cycle_started_at': now,
            'cycle_in_progress': True,
            'task_running': True })
        if not state.get('cycle_sequence'):
            pass
        state['cycle_sequence'] = int(0) + 1
        None(None, None, None)
    with None:
        if not None:
            pass


def record_monitor_cycle_finished(account_id = None, outcome = None, error = None, details = ('', None)):
    if not account_id:
        return None
    now = None.time()
    if not outcome:
        pass
    normalized = str('OK').upper()
    should_log = False
    sequence = 0
    previous_outcome = None
    if not details:
        pass
    safe_details = dict({ })
    with _runtime_lock:
        state = _monitor_health.setdefault(account_id, { })
        previous_outcome = state.get('last_outcome')
        if not state.get('cycle_sequence'):
            pass
        sequence = int(0)
        if not state.get('consecutive_failures'):
            pass
        failures = int(0)
        if normalized in frozenset({'ERROR', 'UIA_TIMEOUT'}):
            failures += 1
        else:
            failures = 0
        if not error:
            pass
        state.update({
            'cycle_finished_at': now,
            'cycle_in_progress': False,
            'last_outcome': normalized,
            'last_error': str('')[:500],
            'consecutive_failures': failures,
            'last_details': safe_details })
        if not sequence <= 3 and sequence % 12 == 0 and normalized != previous_outcome and normalized in frozenset({'CANCELLED', 'ERROR', 'UIA_TIMEOUT'}) and safe_details.get('detected_changes'):
            pass
        should_log = bool(safe_details.get('tasks_created'))
        None(None, None, None)
    with None:
        if not None:
            pass
    if should_log:
        if not error:
            pass
        record_diagnostic_event('MONITOR_CYCLE_FINISHED', account_id, sequence, normalized, str('')[:1000], safe_details, **('account_id', 'sequence', 'outcome', 'error', 'details'))


def record_monitor_task_state(account_id = None, running = None, task_alive = None):
    if not account_id:
        return None
    changed = None
    with _runtime_lock:
        state = _monitor_health.setdefault(account_id, { })
        if not state.get('task_running') != bool(running):
            pass
        changed = state.get('task_alive') != bool(task_alive)
        state.update({
            'task_running': bool(running),
            'task_alive': bool(task_alive),
            'task_checked_at': time.time() })
        None(None, None, None)
    with None:
        if not None:
            pass
    if changed:
        record_diagnostic_event('MONITOR_TASK_STATE', account_id, bool(running), bool(task_alive), **('account_id', 'running', 'task_alive'))


def remove_monitor_health(account_id = None):
    with _runtime_lock:
        _monitor_health.pop(account_id, None)
        None(None, None, None)
    with None:
        if not None:
            pass


def record_uia_event(op, account_id = None, outcome = None, elapsed = None, generation = ('',), error = {
    'op': 'str',
    'account_id': 'Optional[str]',
    'outcome': 'str',
    'elapsed': 'float',
    'generation': 'int',
    'error': 'str',
    'return': 'None' }):
    if not account_id:
        pass
    key = '__global__'
    if not outcome:
        pass
    normalized = str('unknown').lower()
    should_log = False
    with _runtime_lock:
        state = _uia_health.setdefault(key, { })
        previous_outcome = state.get('last_outcome')
        previous_op = state.get('last_op')
        if not state.get('consecutive_timeouts'):
            pass
        consecutive_timeouts = int(0)
        if normalized == 'timeout':
            consecutive_timeouts += 1
        elif normalized == 'success':
            consecutive_timeouts = 0
        if not elapsed:
            pass
        if not generation:
            pass
        if not error:
            pass
        state.update({
            'account_id': account_id,
            'last_op': op,
            'last_outcome': normalized,
            'last_elapsed': round(float(0), 3),
            'last_event_at': time.time(),
            'executor_generation': int(0),
            'consecutive_timeouts': consecutive_timeouts,
            'last_error': str('')[:500] })
        if not normalized != 'success' and previous_outcome != normalized:
            pass
        should_log = bool(previous_op != op)
        None(None, None, None)
    with None:
        if not None:
            pass
    if should_log:
        if not elapsed:
            pass
        if not generation:
            pass
        if not error:
            pass
        record_diagnostic_event('UIA_CALL_FINISHED', account_id, op, normalized, round(float(0), 3), int(0), consecutive_timeouts, str('')[:1000], **('account_id', 'op', 'outcome', 'elapsed', 'executor_generation', 'consecutive_timeouts', 'error'))


def record_wechat_status(account_id = None, status = None, reason_code = None, message = (None, ''), **details):
    if not account_id:
        return None
    changed = None
# WARNING: Decompyle incomplete


def get_runtime_telemetry():
    with _runtime_lock:
        None(None, None, None)
        return {
            'phase': deepcopy(_runtime_phase),
            'monitors': deepcopy(_monitor_health),
            'uia': deepcopy(_uia_health),
            'wechat': deepcopy(_wechat_health) }
        with None:
            if not None:
                pass

_ACCOUNT_ACTION_REQUIRED_STATUSES = {
    'instance_lost',
    'login_required',
    'account_mismatch'}

def summarize_expected_account_states(expected_account_ids = None, account_states = None):
    '''Aggregate account health without turning a partial outage into a global one.

    The Supervisor owns the whole RPA page, while WeChat availability is per
    account.  A/B/C with A online must therefore stay usable; only a state where
    every expected account has positive manual-action evidence may block the
    entire page.
    '''
    expected_accounts = sorted((lambda .0: pass# WARNING: Decompyle incomplete
)(expected_account_ids))
    states = account_states if isinstance(account_states, dict) else { }
    online_accounts = []
    action_required_accounts = []
    pending_accounts = []
    for account_id in expected_accounts:
        state = states.get(account_id) if isinstance(states.get(account_id), dict) else { }
        if not state.get('status'):
            pass
        status = str('unknown')
        if status == 'online':
            online_accounts.append(account_id)
            continue
        if status in _ACCOUNT_ACTION_REQUIRED_STATUSES:
            action_required_accounts.append(account_id)
            continue
        pending_accounts.append(account_id)
    unavailable_accounts = sorted(set(action_required_accounts) | set(pending_accounts))
    if online_accounts:
        pass
    if bool(expected_accounts):
        pass
    return {
        'expected_accounts': expected_accounts,
        'online_accounts': online_accounts,
        'action_required_accounts': action_required_accounts,
        'pending_accounts': pending_accounts,
        'unavailable_accounts': unavailable_accounts,
        'partial': bool(unavailable_accounts),
        'all_action_required': len(action_required_accounts) == len(expected_accounts) }


def classify_restore_account_scope(expected_accounts = None, hosted_accounts = None, restorable_accounts = None):
    '''重启后恢复自动回复前的范围核对，返回拦截原因（None = 可以恢复）。

    「托管范围」和「自动回复范围」是两件事：
      * hosted   —— 此刻真正被托管、且绑定了账号的微信号
      * expected —— 上一次开启自动回复时保存下来的号

    多托管一个号（个人号顺手挂上去，很常见）会让两者不等。这时**必须拦**：
    ``start_monitoring_all()`` 对所有托管实例统一生效，直接恢复就等于让那个号也开始
    自动回复。但它跟「账号对不上」是两回事——绑定的号都在、也在线——所以要用自己的
    reason_code，否则界面会照着 WECHAT_ACCOUNT_MISMATCH 让用户去重新登录微信，
    而用户怎么登都出不来（2026-09-07 线上故障就是这么卡住的）。
    '''
    expected = (lambda .0: pass# WARNING: Decompyle incomplete
)(expected_accounts)
    hosted = (lambda .0: pass# WARNING: Decompyle incomplete
)(hosted_accounts)
    restorable = (lambda .0: pass# WARNING: Decompyle incomplete
)(restorable_accounts)
    if hosted - expected:
        return 'WECHAT_UNEXPECTED_ACCOUNT'
    if not None or restorable:
        return 'WECHAT_ACCOUNT_MISMATCH'


def build_worker_runtime_snapshot(monitor_status = None):
    if not load_feature_state().get('auto_reply'):
        pass
    intent = { }
    telemetry = get_runtime_telemetry()
    monitor_status = monitor_status if isinstance(monitor_status, dict) else { }
    if not monitor_status.get('monitors'):
        pass
    monitor_rows = { }
    for account_id, row in monitor_rows.items():
        health = telemetry['monitors'].setdefault(account_id, { })
        health['task_running'] = bool(row.get('running'))
        health['task_alive'] = bool(row.get('task_alive', row.get('running')))
        if not row.get('check_interval'):
            pass
        health['check_interval'] = float(0)
        health['user_paused'] = bool(row.get('user_paused'))
    desired = bool(intent.get('enabled'))
    if not intent.get('account_ids'):
        pass
    expected_accounts = list([])
    if monitor_status.get('running') and monitor_status.get('manager_task_alive', True) and monitor_rows:
        pass
    actual = bool(all((lambda .0: for row in .0:
bool(row.get('task_alive', row.get('running'))))(monitor_rows.values())))
    account_summary = summarize_expected_account_states(expected_accounts, telemetry['wechat'])
    action_required = None
    if account_summary['all_action_required']:
        blocked_account = account_summary['action_required_accounts'][0]
        if not telemetry['wechat'].get(blocked_account):
            pass
        action_required = { }
    if not telemetry.get('phase'):
        pass
    phase = { }
    if not desired:
        runtime_status = 'idle'
        reason_code = None
    elif action_required:
        runtime_status = 'action_required'
        if not action_required.get('reason_code'):
            pass
        reason_code = 'WECHAT_LOGIN_REQUIRED'
    elif phase.get('status') in frozenset({'failed', 'maintenance', 'action_required', 'restoring'}):
        runtime_status = phase.get('status')
        reason_code = phase.get('reason_code')
    elif actual:
        runtime_status = 'healthy'
        reason_code = None
    else:
        runtime_status = 'degraded'
        if not phase.get('reason_code'):
            pass
        reason_code = 'AUTO_REPLY_NOT_RUNNING'
    if not intent.get('reply_mode'):
        pass
    return {
        'status': runtime_status,
        'reason_code': reason_code,
        'worker_generation': os.environ.get('WEBOT_WORKER_GENERATION'),
        'auto_reply': {
            'desired': desired,
            'actual': actual,
            'reply_mode': 'local',
            'expected_accounts': expected_accounts,
            'active_accounts': sorted(monitor_rows.keys()),
            'online_accounts': account_summary['online_accounts'],
            'unavailable_accounts': account_summary['unavailable_accounts'],
            'partial': account_summary['partial'] },
        'phase': phase,
        'monitors': telemetry['monitors'],
        'uia': telemetry['uia'],
        'wechat': telemetry['wechat'] }


def evaluate_worker_semantic_health(heartbeat = None, now = None, monitor_stale_timeout = None, uia_timeout_limit = (None, 45, 2)):
    '''Classify a worker heartbeat without performing any probe or mutation.'''
    current_time = float(now if now is not None else time.time())
    runtime = heartbeat.get('runtime') if isinstance(heartbeat.get('runtime'), dict) else { }
    auto_reply = runtime.get('auto_reply') if isinstance(runtime.get('auto_reply'), dict) else { }
    if runtime.get('status') == 'action_required':
        if not runtime.get('reason_code'):
            pass
        return {
            'classification': 'action_required',
            'reason_code': 'WECHAT_LOGIN_REQUIRED' }
    if not None.get('desired'):
        if auto_reply.get('actual'):
            return {
                'classification': 'unhealthy',
                'reason_code': 'AUTO_REPLY_DISABLE_DRIFT' }
        return {
            'classification': None,
            'reason_code': None }
    environment = runtime.get('environment') if None(runtime.get('environment'), dict) else { }
    if environment.get('desktop_status') == 'locked':
        return {
            'classification': 'degraded',
            'reason_code': 'WINDOWS_SESSION_LOCKED' }
    if None.get('status') == 'restoring':
        if not runtime.get('reason_code'):
            pass
        return {
            'classification': 'degraded',
            'reason_code': 'AUTO_REPLY_RESTORING' }
    if None.get('status') == 'maintenance':
        if not runtime.get('reason_code'):
            pass
        return {
            'classification': 'degraded',
            'reason_code': 'RPA_MAINTENANCE' }
    monitors = runtime.get('monitors') if None(runtime.get('monitors'), dict) else { }
    if not monitors or auto_reply.get('actual'):
        return {
            'classification': 'unhealthy',
            'reason_code': 'AUTO_REPLY_TASK_MISSING' }
    degraded_reason = None
    for account_id, state in monitors.items():
        if not state.get('task_alive', state.get('task_running', False)):
            return {
                'classification': 'unhealthy',
                'reason_code': 'AUTO_REPLY_TASK_DEAD',
                'account_id': account_id }
        if not state.get('cycle_finished_at'):
            pass
        finished_at = None(0)
        if not state.get('cycle_started_at'):
            pass
        started_at = float(0)
        reference = max(finished_at, started_at)
        allowed_silence = float(monitor_stale_timeout)
        if not state.get('cycle_in_progress'):
            if not state.get('check_interval'):
                pass
            allowed_silence += max(0, float(0))
        if reference and current_time - reference > allowed_silence:
            return {
                'classification': 'unhealthy',
                'reason_code': 'AUTO_REPLY_MONITOR_STALLED',
                'account_id': account_id,
                'cycle_age': round(current_time - reference, 3) }
        if not state.get('last_outcome'):
            pass
        outcome = None('').upper()
        if outcome == 'SKIPPED_OCCLUDED':
            if not degraded_reason:
                pass
            degraded_reason = 'WECHAT_WINDOW_OCCLUDED'
        elif not outcome in frozenset({'ERROR', 'UIA_TIMEOUT'}):
            if not state.get('consecutive_failures'):
                pass
            if not int(0) > 0 or degraded_reason:
                pass
        degraded_reason = 'AUTO_REPLY_POLL_FAILED'
    uia = runtime.get('uia') if isinstance(runtime.get('uia'), dict) else { }
    for account_id, state in uia.items():
        if not state.get('consecutive_timeouts'):
            pass
        if int(0) >= uia_timeout_limit:
            return {
                'classification': 'unhealthy',
                'reason_code': 'UIA_REPEATED_TIMEOUT',
                'account_id': account_id }
        if degraded_reason:
            return {
                'classification': 'degraded',
                'reason_code': degraded_reason }
        return {
            'classification': None,
            'reason_code': None }


def advance_liveness_failure_count(current_count = None, http_ok = None, heartbeat_fresh = None):
    '''Count only consecutive samples where both liveness signals are lost.

    The heartbeat and HTTP probe validate the same event loop through different
    paths.  Either fresh signal proves that the worker can still make progress;
    restarting when just one probe is delayed creates false positives during
    long or resource-intensive RPA operations.
    '''
    if http_ok or heartbeat_fresh:
        return 0
    if not current_count:
        pass
    return None(0, int(0)) + 1

