# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_add_friend_manager.marshal (Python 3.9)

'''Process-owned macOS automatic friend-add manager.

The scheduling, queue, daily-limit, risk and multi-account policies mirror the
stable Windows task.  Only the final UI transaction is delegated to the
macOS AX runtime, so this module never imports Windows UIAutomation.
'''
from __future__ import annotations
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Sequence
from uuid import uuid4
from WeRobotCore.adapters.contact_storage import ExplicitPathFriendAddStore
from WeRobotCore.application.add_friend import AddFriendRequest, AddFriendResult, AddFriendRuntime, AddFriendStatus, AddFriendWorkflow
from WeRobotCore.task_system_v3.types import ExecutionMode, ScheduleConfig, TaskExecutionContext, TaskType, TriggerType
from WeRobotCore.utils.logger import get_logger

class MacOSAddFriendManager:
    '''Own the Mac queue and one recurring add-friend schedule.'''
    
    def __init__(self = None, *, scheduler, permission_manager, database_path):
        if scheduler is None or permission_manager is None:
            raise ValueError('scheduler and permission_manager are required')
        if not isinstance(database_path, Path) or database_path.is_absolute():
            raise ValueError('database_path must be an absolute pathlib.Path')
        self.scheduler = scheduler
        self.permission_manager = permission_manager
        self.store = ExplicitPathFriendAddStore(database_path)
        self._runtime = None
        self._configuration_factory = None
        self._running = False
        self._executing = False
        self._active_task_ids = set()
        self._last_account_index = -1
        self._toggle_lock = None
        self.logger = get_logger('macos_add_friend_manager')
        self.scheduler.register_task_executor(TaskType.ADD_FRIEND, self.execute_task)

    
    def bind_runtime(self = None, runtime = None):
        if not isinstance(runtime, AddFriendRuntime):
            raise TypeError('runtime must implement AddFriendRuntime')
        if self._runtime is not None and self._runtime is not runtime:
            raise RuntimeError('automatic friend-add runtime is already bound')
        self._runtime = runtime

    
    def bind_configuration_factory(self = None, factory = None):
        if not callable(getattr(factory, 'global_configuration', None)):
            raise TypeError('configuration factory must expose global_configuration()')
        if self._configuration_factory is not None and self._configuration_factory is not factory:
            raise RuntimeError('automatic friend-add configuration is already bound')
        self._configuration_factory = factory

    
    def _lock(self = None):
        if self._toggle_lock is None:
            self._toggle_lock = asyncio.Lock()
        return self._toggle_lock

    
    def is_running(self = None):
        return self._running

    
    async def start(self = None):
        if self._runtime is None:
            raise RuntimeError('automatic friend-add runtime is not bound')
        self._running = True
        return True

    
    async def stop(self = None):
        self._running = False
        self._last_account_index = -1
        return True

    
    def _positive_int(name = None, value = None, minimum = staticmethod, maximum = {
        'name': 'str',
        'value': 'Any',
        'minimum': 'int',
        'maximum': 'int',
        'return': 'int' }):
        if isinstance(value, bool):
            raise ValueError('{} must be an integer'.format(name))
    # WARNING: Decompyle incomplete

    _positive_int = None(_positive_int)
    
    def _account_ids(value = None):
