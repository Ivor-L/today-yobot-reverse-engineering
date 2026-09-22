# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: monitor_runtime_source.marshal (Python 3.9)

'''macOS runtime facts for the shared multi-account monitor.'''
from typing import Optional, Tuple
from WeRobotCore.application.monitoring import MonitorAccount, MonitorAccountState, MonitorAccountStatus, MonitorPollVisibility, MonitorPollVisibilityState
from WeRobotCore.domain import AccountInstance, InstanceState
from WeRobotCore.ports import NativeInstanceRef, ProcessManager
from driver import MacOSAxDriver

class MacOSMonitorRuntimeSource:
    '''Project attached Driver accounts without importing Windows managers.

    macOS session-list reads use Accessibility facts and do not rely on the
    Windows HWND/screen-area detector.  Conversation reads and text sends own
    their conditional foreground verification inside the signed Helper, so
    this source reports the shared session-list visibility gate as not
    applicable rather than pretending a window is visible.
    '''
    
    def __init__(self = None, driver = None, processes = None):
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be a MacOSAxDriver')
        if not isinstance(processes, ProcessManager):
            raise TypeError('processes must implement ProcessManager')
        self._driver = driver
        self._processes = processes

    
    async def _binding(self = None, account = None):
        if not account.account_id:
            return None
        await None._driver.get_native_ref_by_account(account.account_id)
        return <NODE:28>

    
    async def _is_process_alive(self = None, account = None):
        await self._binding(account)
        binding = <NODE:28>
        if binding is None or binding.process_id is None:
            return False
        await self._processes.is_running(binding.process_id)
        return None(<NODE:28>)

    
    async def list_ready_accounts(self = None):
        result = []
        await self._driver.list_attached()
        for account in <NODE:28>:
            if not account.state is not InstanceState.READY and account.account_id or account.nickname:
                continue
            await self._is_process_alive(account)
            if not <NODE:28>:
                continue
            result.append(MonitorAccount(account.account_id, account.nickname, account.instance_id.value, **('account_id', 'nickname', 'instance_id')))
        return tuple(result)

    
    async def get_account_status(self = None, account_id = None):
        await self._driver.get_by_account(account_id)
        account = <NODE:28>
        if account is None:
            return MonitorAccountStatus(MonitorAccountState.INSTANCE_LOST, 'MACOS_ATTACHED_ACCOUNT_NOT_FOUND', 'macOS WeChat account is no longer attached', **('state', 'reason_code', 'message'))
        if None.state is not InstanceState.READY:
            return MonitorAccountStatus(MonitorAccountState.OFFLINE, 'MACOS_ATTACHED_ACCOUNT_NOT_READY', 'macOS WeChat account is not ready', **('state', 'reason_code', 'message'))
        await None._is_process_alive(account)
        if not <NODE:28>:
            return MonitorAccountStatus(MonitorAccountState.INSTANCE_LOST, 'MACOS_WECHAT_PROCESS_NOT_RUNNING', 'macOS WeChat process is no longer running', **('state', 'reason_code', 'message'))
        return None(MonitorAccountState.ONLINE, 'macOS WeChat account is attached and running', **('state', 'message'))

    
    async def get_poll_visibility(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return MonitorPollVisibility(MonitorPollVisibilityState.NOT_APPLICABLE, 'macos_ax_session_list_does_not_use_windows_occlusion_gate', **('state', 'reason'))

    
    async def cleanup_invalid_accounts(self = None):
        pass


