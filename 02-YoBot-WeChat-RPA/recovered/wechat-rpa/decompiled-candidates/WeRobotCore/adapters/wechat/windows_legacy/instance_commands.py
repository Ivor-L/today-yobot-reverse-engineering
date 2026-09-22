# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_commands.marshal (Python 3.9)

'''Windows Legacy backends for shared instance exit/switch commands.

All mature Manager, WeChat facade, monitor and database operations are
injected.  Importing this module therefore does not import native Windows
packages or the production API entrypoint.
'''
from typing import Any, Callable, Mapping, Optional, Protocol
from WeRobotCore.application.instances import InstanceContactCounts, InstanceContactStatsProvider, InstanceExitBackend, InstanceExitResult, InstanceMonitorStopper, InstanceMonitorStopResult, InstanceMonitorStopStatus, InstanceSwitchBackend, InstanceSwitchResult
from WeRobotCore.domain import ErrorCode, InstanceId

class WindowsLegacyInstanceCommandOperations(Protocol):
    '''Current Windows owners needed by the command backend.'''
    
    def exit_instance(self = None, instance_id = None):
        pass

    
    def get_instance_info(self = None, instance_id = None):
        pass

    
    def switch_active_instance(self = None, instance_id = None):
        pass

    
    def get_active_instance(self = None):
        pass

    
    def select_wechat_facade(self = None, window_handle = None):
        pass

    
    def initialize_account(self = None, facade = None, window_handle = None, account_info = {
        'facade': Any,
        'window_handle': int,
        'account_info': Optional[Mapping[(str, Any)]],
        'return': Mapping[(str, Any)] }):
        pass

    
    def bind_account(self = None, account_id = None, window_handle = None):
        pass

    
    def update_account_info(self = None, instance_id = None, account_info = None):
        pass

    
    def refresh_chat_facade(self = None, window_handle = None, account_info = None):
        pass



def _require_operations(operations = None):
    required = ('exit_instance', 'get_instance_info', 'switch_active_instance', 'get_active_instance', 'select_wechat_facade', 'initialize_account', 'bind_account', 'update_account_info', 'refresh_chat_facade')
    missing = (lambda .0 = None: [ name for name in .0 if callable(getattr(operations, name, None)) ])(required)
    if missing:
        raise TypeError('operations does not provide required methods: {}'.format(', '.join(missing)))


def _account_info(raw = None):
    value = raw.get('account_info')
    if isinstance(value, Mapping):
        return value


def _window_handle(raw = None):
    value = raw.get('window_handle')
    if isinstance(value, bool):
        raise ValueError('Windows active instance has an invalid window_handle')
# WARNING: Decompyle incomplete


def _identity(account_info = None):
    if not account_info.get('account_id'):
        pass
    account_id = str('').strip()
    if not account_info.get('nickname'):
        pass
    nickname = str('').strip()
    return (account_id, nickname)


class WindowsLegacyInstanceCommandBackend(InstanceSwitchBackend, InstanceExitBackend):
    '''Preserve mature Windows command/facade behavior behind shared ports.'''
    
    def __init__(self = None, operations = None):
        _require_operations(operations)
        self._operations = operations

    
    async def exit(self = None, instance_id = None):
        self._require_instance_id(instance_id)
        exited = self._operations.exit_instance(instance_id.value)
        if not exited:
            return InstanceExitResult(instance_id, False, ErrorCode.INSTANCE_NOT_FOUND, '未找到指定实例', **('instance_id', 'success', 'code', 'message'))
        raw = None._operations.get_instance_info(instance_id.value)
        account_id = None
        if raw is not None:
            if not isinstance(raw, Mapping):
                raise TypeError('Legacy get_instance_info must return a mapping')
            (account_id, _) = _identity(_account_info(raw))
            if not account_id:
                pass
            account_id = None
        return InstanceExitResult(instance_id, True, ErrorCode.OK, account_id, **('instance_id', 'success', 'code', 'account_id'))

    
    async def switch(self = None, instance_id = None):
        self._require_instance_id(instance_id)
        manager_result = self._operations.switch_active_instance(instance_id.value)
        if manager_result is False:
            return InstanceSwitchResult(instance_id, False, ErrorCode.OPERATION_FAILED, "'bool' object has no attribute 'get'", **('instance_id', 'success', 'code', 'message'))
        if not None(manager_result, Mapping):
            raise TypeError('Legacy switch_active_instance must return a mapping')
        if not manager_result.get('success', False):
            return InstanceSwitchResult(instance_id, False, ErrorCode.INSTANCE_NOT_FOUND, '404: 实例 {} 不存在'.format(instance_id.value), **('instance_id', 'success', 'code', 'message'))
        active = None._operations.get_active_instance()
        if not active:
            return InstanceSwitchResult(instance_id, False, ErrorCode.OPERATION_FAILED, '500: 获取活动实例信息失败', **('instance_id', 'success', 'code', 'message'))
        if not None(active, Mapping):
            raise TypeError('Legacy get_active_instance must return a mapping')
        window_handle = _window_handle(active)
        facade = self._operations.select_wechat_facade(window_handle)
        account_info = dict(_account_info(active))
        if not manager_result.get('initialized', False):
            initialized = self._operations.initialize_account(facade, window_handle, account_info)
            if not isinstance(initialized, Mapping):
                raise TypeError('Legacy initialize_multi must return a mapping')
            if not initialized.get('success'):
                return InstanceSwitchResult(instance_id, False, ErrorCode.OPERATION_FAILED, '500: 切换实例后初始化失败', True, **('instance_id', 'success', 'code', 'message', 'retryable'))
            if not initialized.get('account_id'):
                pass
            account_id = None('').strip()
            if not initialized.get('nickname'):
                pass
            nickname = str('').strip()
            if not account_id or nickname:
                raise ValueError('successful Legacy initialization omitted account identity')
            account_info = {
                'nickname': nickname,
                'account_id': account_id }
            self._operations.bind_account(account_id, window_handle)
            self._operations.update_account_info(instance_id.value, account_info)
        (account_id, nickname) = _identity(account_info)
        if not account_id or nickname:
            raise ValueError('switched Legacy instance omitted account identity')
        self._operations.refresh_chat_facade(window_handle, account_info)
        return InstanceSwitchResult(instance_id, True, ErrorCode.OK, account_id, nickname, **('instance_id', 'success', 'code', 'account_id', 'nickname'))

    
    def _require_instance_id(instance_id = None):
        if not isinstance(instance_id, InstanceId):
            raise TypeError('instance_id must be an InstanceId')

    _require_instance_id = None(_require_instance_id)


class _LegacyMonitorFacade(Protocol):
    instance_monitors: Mapping[(str, Any)] = '_LegacyMonitorFacade'
    
    async def stop_instance_monitor(self = None, account_id = None):
        pass



class WindowsLegacyInstanceMonitorStopper(InstanceMonitorStopper):
    
    def __init__(self = None, monitor = None):
        if not hasattr(monitor, 'instance_monitors') or callable(getattr(monitor, 'stop_instance_monitor', None)):
            raise TypeError('monitor must provide inventory and stop operation')
        self._monitor = monitor

    
    async def stop_if_running(self = None, account_id = None):
        if not account_id:
            pass
        account_id = str('').strip()
        if not account_id:
            raise ValueError('account_id must be provided')
        if account_id not in self._monitor.instance_monitors:
            return InstanceMonitorStopResult(InstanceMonitorStopStatus.NOT_RUNNING)
        await None._monitor.stop_instance_monitor(account_id)
        return InstanceMonitorStopResult(InstanceMonitorStopStatus.STOPPED)



class _LegacyContactDatabase(Protocol):
    
    def get_contact_counts(self = None, account_id = None):
        pass



class WindowsLegacyInstanceContactStatsProvider(InstanceContactStatsProvider):
    
    def __init__(self = None, database_factory = None):
        if not callable(database_factory):
            raise TypeError('database_factory must be callable')
        self._database_factory = database_factory

    
    async def counts(self = None, account_id = None):
        if not account_id:
            pass
        account_id = str('').strip()
        if not account_id:
            raise ValueError('account_id must be provided')
        database = self._database_factory()
        if not callable(getattr(database, 'get_contact_counts', None)):
            raise TypeError('database must provide get_contact_counts')
        value = database.get_contact_counts(account_id)
        if not isinstance(value, Mapping):
            raise TypeError('Legacy contact counts must be a mapping')
        return InstanceContactCounts(value.get('friend_count', 0), value.get('group_count', 0), **('friend_count', 'group_count'))


