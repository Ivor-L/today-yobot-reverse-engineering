# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_control_process.marshal (Python 3.9)

'''Explicit process ownership for the shared macOS task system.

Importing this module does not import the V2/V3 task systems, create their
singletons, touch product storage, load native frameworks, or perform a
network request.  The signed macOS entry must call
``create_macos_control_process_dependencies`` exactly once and pass the
returned shared Manager/Monitor to ``MacOSControlProductOwner``.
'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Awaitable, Callable, Mapping, Optional
from WeRobotCore.adapters.platform.macos_native import MacOSAppPaths
from WeRobotCore.application.auto_reply.config_readiness import PrivateAgentCapabilityProbe

async def probe_private_agent_capabilities(api_url = None, api_token = None):
    '''Invoke the mature Agent probe only when readiness explicitly asks.

    Keeping the import inside the coroutine preserves the no-network and
    no-requests construction boundary.  Calling this function is a real
    network operation and remains behind the Control authorization/readiness
    request; merely composing the process never invokes it.
    '''
    probe_capabilities = probe_capabilities
    import WeRobotCore.services.agentic_service
    await probe_capabilities(api_url, api_token)
    return <NODE:28>


def _require_callable(owner = None, name = None):
    value = getattr(owner, name, None)
    if not callable(value):
        raise TypeError('{} must expose {}()'.format(type(owner).__name__, name))
    return value


class MacOSTaskSystemLifecycle:
    '''Start and stop one explicitly rooted AutoReply task system.

    Windows registers the V3 manager callbacks in ``api_server`` startup and
    otherwise lets the Scheduler fall back to ``DataManager`` on first use.
    The standalone macOS process cannot inherit either implicit owner.  This
    lifecycle therefore fixes the Scheduler database path before any monitor
    can create a task and shuts Monitor -> Manager -> Scheduler down in that
    order.
    '''
    
    def __init__(self = None, *, paths, scheduler, permission_manager, auto_reply_manager, multi_chat_monitor, mass_sending_manager, auto_follow_manager, moment_comment_manager, moment_post_manager, add_friend_manager, friend_request_manager, sync_contacts_manager):
        if not isinstance(paths, MacOSAppPaths):
            raise TypeError('paths must be MacOSAppPaths')
        for owner, methods in ((scheduler, ('initialize', 'process_existing_tasks', 'shutdown')), (auto_reply_manager, ('start', 'stop', 'is_running')), (multi_chat_monitor, ('start_monitoring_all', 'stop_monitoring_all', 'is_running'))):
            for method in methods:
                _require_callable(owner, method)
        if mass_sending_manager is not None:
            for method in ('start', 'stop', 'bind_runtime'):
                _require_callable(mass_sending_manager, method)
        if auto_follow_manager is not None:
            for method in ('start', 'stop', 'bind_runtime'):
                _require_callable(auto_follow_manager, method)
        if moment_comment_manager is not None:
            for method in ('start', 'stop', 'bind_runtime'):
                _require_callable(moment_comment_manager, method)
        if moment_post_manager is not None:
            for method in ('start', 'stop', 'bind_runtime'):
                _require_callable(moment_post_manager, method)
        if add_friend_manager is not None:
            for method in ('start', 'stop', 'bind_runtime', 'bind_configuration_factory'):
                _require_callable(add_friend_manager, method)
        if friend_request_manager is not None:
            for method in ('start', 'stop', 'bind_runtime', 'bind_configuration_factory'):
                _require_callable(friend_request_manager, method)
        if sync_contacts_manager is not None:
            for method in ('start', 'stop', 'bind_runtime'):
                _require_callable(sync_contacts_manager, method)
        self._paths = paths
        self._scheduler = scheduler
        self._permission_manager = permission_manager
        self._auto_reply_manager = auto_reply_manager
        self._multi_chat_monitor = multi_chat_monitor
        self._mass_sending_manager = mass_sending_manager
        self._auto_follow_manager = auto_follow_manager
        self._moment_comment_manager = moment_comment_manager
        self._moment_post_manager = moment_post_manager
        self._add_friend_manager = add_friend_manager
        self._friend_request_manager = friend_request_manager
        self._sync_contacts_manager = sync_contacts_manager
        self._state = 'new'
        self._transition_lock = None

    
    def scheduler_database_path(self = None):
        return self._paths.data_root / 'scheduler_v3.db'

    scheduler_database_path = None(scheduler_database_path)
    
    def paths(self = None):
        return self._paths

    paths = None(paths)
    
    def scheduler(self = None):
        return self._scheduler

    scheduler = None(scheduler)
    
    def permission_manager(self = None):
        return self._permission_manager

    permission_manager = None(permission_manager)
    
    def auto_reply_manager(self = None):
        return self._auto_reply_manager

    auto_reply_manager = None(auto_reply_manager)
    
    def multi_chat_monitor(self = None):
        return self._multi_chat_monitor

    multi_chat_monitor = None(multi_chat_monitor)
    
    def mass_sending_manager(self = None):
        return self._mass_sending_manager

    mass_sending_manager = None(mass_sending_manager)
    
    def auto_follow_manager(self = None):
        return self._auto_follow_manager

    auto_follow_manager = None(auto_follow_manager)
    
    def moment_comment_manager(self = None):
        return self._moment_comment_manager

    moment_comment_manager = None(moment_comment_manager)
    
    def moment_post_manager(self = None):
        return self._moment_post_manager

    moment_post_manager = None(moment_post_manager)
    
    def add_friend_manager(self = None):
        return self._add_friend_manager

    add_friend_manager = None(add_friend_manager)
    
    def friend_request_manager(self = None):
        return self._friend_request_manager

    friend_request_manager = None(friend_request_manager)
    
    def sync_contacts_manager(self = None):
        return self._sync_contacts_manager

    sync_contacts_manager = None(sync_contacts_manager)
    
    def state(self = None):
        return self._state

    state = None(state)
    
    def started(self = None):
        return self._state == 'running'

    started = None(started)
    
    def _lock(self = None):
        lock = self._transition_lock
        if lock is None:
            lock = asyncio.Lock()
            self._transition_lock = lock
        return lock

    
    async def start(self = None):
        '''Initialize the explicit Scheduler before any Monitor request.'''
        pass
    # WARNING: Decompyle incomplete

    
    async def stop(self = None):
        '''Stop runtime tasks without rewriting the desired AutoReply state.'''
        pass
    # WARNING: Decompyle incomplete


MacOSControlProcessDependencies = dataclass(True, **('frozen',))(<NODE:12>)

def create_macos_control_process_dependencies(*, paths, private_agent_probe):
    '''Claim the real shared task owners without starting any of them.

    This factory intentionally fails if another composition has already
    created the global Scheduler or AutoReply manager.  Reusing an unknown
    pre-bound singleton could silently mix Windows and Mac Driver bindings.
    '''
    if not isinstance(paths, MacOSAppPaths):
        raise TypeError('paths must be MacOSAppPaths')
    if not callable(private_agent_probe):
        raise TypeError('private_agent_probe must be callable')
    get_permission_manager = get_permission_manager
    import WeRobotCore.task_system_v3.permission_manager
    GlobalManagerRegistry = GlobalManagerRegistry
    get_auto_reply_manager = get_auto_reply_manager
    get_scheduler = get_scheduler
    register_all_managers = register_all_managers
    import WeRobotCore.task_system_v3.unified_manager_pattern
    occupied = None((lambda .0 = None: 