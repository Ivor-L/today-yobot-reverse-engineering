# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: contact_sync_runner.marshal (Python 3.9)

"""Run long contact synchronization without blocking the API event loop.

Contact collection is a synchronous UI Automation operation and may take a
long time for large address books.  Running it directly in an ``async`` route
blocks FastAPI's event loop, which also prevents the worker heartbeat and
``/api/health`` endpoint from responding.  The external supervisor then
mistakes the busy worker for a dead worker and restarts it.

Contact syncs use the same single UIA worker as chat polling and sending.
``WeChat`` instances are scoped by thread, so the instance must be resolved
and initialized inside that worker.
"""
from __future__ import annotations
import asyncio
import logging
import threading
import uuid
from functools import partial
from typing import Any, Dict, Optional
_CONTACT_SYNC_STATE_LOCK = threading.Lock()
_CONTACT_SYNC_STATE = 'idle'

class ContactSyncBusyError(RuntimeError):
    '''Raised when another UI-exclusive contact sync is already in progress.'''
    pass


def is_contact_sync_active():
    '''Whether contact sync currently owns the WeChat UI.'''
    with _CONTACT_SYNC_STATE_LOCK:
        None(None, None, None)
        return _CONTACT_SYNC_STATE == 'running'
        with None:
            if not None:
                pass


def is_contact_sync_in_progress():
    '''Whether a contact sync is waiting for permission or already running.'''
    with _CONTACT_SYNC_STATE_LOCK:
        None(None, None, None)
        return _CONTACT_SYNC_STATE != 'idle'
        with None:
            if not None:
                pass


def _claim_contact_sync():
    global _CONTACT_SYNC_STATE
    with _CONTACT_SYNC_STATE_LOCK:
        if _CONTACT_SYNC_STATE != 'idle':
            raise ContactSyncBusyError('已有通讯录同步正在执行，请等待完成后再试')
        _CONTACT_SYNC_STATE = 'pending'
        None(None, None, None)
    with None:
        if not None:
            pass


def _mark_contact_sync_running():
    global _CONTACT_SYNC_STATE
    with _CONTACT_SYNC_STATE_LOCK:
        _CONTACT_SYNC_STATE = 'running'
        None(None, None, None)
    with None:
        if not None:
            pass


def _release_contact_sync():
    global _CONTACT_SYNC_STATE
    with _CONTACT_SYNC_STATE_LOCK:
        _CONTACT_SYNC_STATE = 'idle'
        None(None, None, None)
    with None:
        if not None:
            pass


def _resolve_account_id(account_id = None):
    if account_id:
        return account_id
    InstanceManagerV2 = InstanceManagerV2
    import WeRobotCore.core.instance_manager_v2
    active_instance = InstanceManagerV2().get_active_instance()
    if active_instance or active_instance.get('manually_exited', False):
        raise ValueError('未找到活跃的微信窗口，请先刷新账号并选择微信实例')
    if not active_instance.get('account_info'):
        pass
    active_account_id = { }.get('account_id')
    if not active_account_id:
        raise ValueError('当前微信实例尚未初始化，请先刷新账号')
    return active_account_id


def _ensure_thread_wechat(account_id = None):
    ensure_thread_wechat = ensure_thread_wechat
    import WeRobotCore.api.chat
    return ensure_thread_wechat(account_id)


def _normalize_result(raw_result = None, wx = None):
    if isinstance(raw_result, dict):
        success = bool(raw_result.get('success', False))
        if not raw_result.get('message'):
            pass
        message = str('')
        if not raw_result.get('contacts_count'):
            pass
        contacts_count = int(0)
    else:
        success = bool(raw_result)
        message = ''
        contacts_count = 0
    if not success and message:
        if not getattr(wx, 'last_sync_error', None):
            pass
        message = str('同步通讯录失败，请查看运行日志')
    if not getattr(wx, 'account_info', None):
        pass
    return {
        'success': success,
        'message': message,
        'contacts_count': contacts_count,
        'account_info': dict({ }),
        'raw_result': raw_result }


def _run_contact_sync_in_thread(account_id = None, contact_type = None, incremental = None):
    resolved_account_id = _resolve_account_id(account_id)
    wx = _ensure_thread_wechat(resolved_account_id)
    if contact_type == 'group':
        raw_result = wx.sync_groups()
    elif contact_type == 'friend':
        existing_names = None
        if incremental:
            get_current_contact_names = get_current_contact_names
            import WeRobotCore.api.friend
            existing_names = get_current_contact_names(resolved_account_id)
        raw_result = wx.sync_contacts(existing_names, **('existing_names',))
    else:
        raise ValueError(f'''不支持的通讯录同步类型: {contact_type}''')
    return _normalize_result(raw_result, wx)


async def _acquire_manual_permission():
    '''Keep manual sync mutually exclusive with scheduler-owned RPA tasks.'''
    get_permission_manager = get_permission_manager
    import WeRobotCore.task_system_v3.permission_manager
    PermissionLevel = PermissionLevel
    PermissionRequest = PermissionRequest
    TaskPriority = TaskPriority
    TaskType = TaskType
    import WeRobotCore.task_system_v3.types
    permission_manager = get_permission_manager()
    if permission_manager.get_current_holder() is not None:
        raise ContactSyncBusyError('RPA 正在执行其他任务，请等待任务完成后再同步通讯录')
    task_id = f'''manual_contact_sync_{uuid.uuid4().hex}'''
    request = PermissionRequest('manual_contact_sync', task_id, TaskType.SYNC_CONTACTS, PermissionLevel.EXCLUSIVE, TaskPriority.MEDIUM, 3600, 3600, False, **('scheduler_name', 'task_id', 'task_type', 'permission_level', 'priority', 'estimated_duration', 'timeout_seconds', 'pause_chat_monitor'))
    await permission_manager.request_permission(request)
    if not <NODE:28>:
        raise ContactSyncBusyError('未能获得 RPA 执行权限，请稍后重试')
    return (permission_manager, task_id)


async def _pause_chat_monitor_for_sync():
    '''Stop polling before contact manager starts manipulating the same UI.'''
    multi_chat_monitor = multi_chat_monitor
    import WeRobotCore.task_system_v2.multi_chat_monitor
    state = {
        'monitor': multi_chat_monitor,
        'was_running': bool(multi_chat_monitor.is_running()),
        'reply_mode': getattr(multi_chat_monitor, '_reply_mode', 'local') }
    if state['was_running']:
        await multi_chat_monitor.stop_monitoring_all(False, **('user_initiated',))
    return state


async def _resume_chat_monitor_after_sync(state = None):
    if not state or state.get('was_running'):
        return None
    monitor = None['monitor']
# WARNING: Decompyle incomplete


async def _wait_for_existing_chat_uia():
    '''Wait for a UIA call that was already running when monitoring stopped.'''
    wait_for_uia_idle = wait_for_uia_idle
    import WeRobotCore.api.chat
    await wait_for_uia_idle()


def _submit_contact_sync(work):
    '''Submit contact work to the one process-wide UIA executor.'''
    submit_uia_work = submit_uia_work
    import WeRobotCore.api.chat
    return submit_uia_work(work)


def _enter_contact_sync_runtime_phase():
    '''Tell the semantic watchdog that monitor suspension is intentional.'''
    get_runtime_telemetry = get_runtime_telemetry
    set_runtime_phase = set_runtime_phase
    import WeRobotCore.core.watchdog_state
    if not get_runtime_telemetry().get('phase'):
        pass
    previous_phase = dict({ })
    set_runtime_phase('maintenance', 'CONTACT_SYNC_RUNNING', '正在同步通讯录，自动回复监听已临时暂停')
    return previous_phase


def _restore_runtime_phase(previous_phase = None):
    if previous_phase is None:
        return None
    get_runtime_telemetry = get_runtime_telemetry
    set_runtime_phase = set_runtime_phase
    import WeRobotCore.core.watchdog_state
    if not get_runtime_telemetry().get('phase'):
        pass
    current_phase = { }
    if not current_phase.get('status') == 'maintenance' or current_phase.get('reason_code') == 'CONTACT_SYNC_RUNNING':
        return None
    if not previous_phase.get('status'):
        pass
    if not previous_phase.get('message'):
        pass
    None('idle', previous_phase.get('reason_code'), '')


async def _cleanup_contact_sync(monitor_state = None, permission_manager = None, permission_task_id = None, previous_runtime_phase = {
    'monitor_state': 'Optional[Dict[str, Any]]',
    'permission_manager': 'Any',
    'permission_task_id': 'Optional[str]',
    'previous_runtime_phase': 'Optional[Dict[str, Any]]',
    'return': 'None' }):
    _release_contact_sync()
# WARNING: Decompyle incomplete


async def run_contact_sync(account_id = None, contact_type = None, *, incremental, permission_already_held):
    """Run one contact sync while leaving the caller's event loop responsive."""
    _claim_contact_sync()
    permission_manager = None
    permission_task_id = None
    monitor_state = None
    previous_runtime_phase = None
# WARNING: Decompyle incomplete

