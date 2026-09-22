# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_friend_request_manager.marshal (Python 3.9)

'''Windows-parity automatic friend-request orchestration for macOS.'''
from __future__ import annotations
import asyncio
from datetime import datetime
import random
from typing import Any, Dict, Mapping, Optional, Sequence
from uuid import uuid4
from WeRobotCore.application.friend_request import FriendRequestRuntime
from WeRobotCore.task_system_v3.types import ExecutionMode, ScheduleConfig, TaskExecutionContext, TaskStatus, TaskType, TriggerType
from WeRobotCore.utils.greeting_manager import GreetingManager
from WeRobotCore.utils.logger import TaskLogger, get_logger

class MacOSFriendRequestManager:
    '''Keep mature task policy outside the macOS AX transaction.'''
    
    def __init__(self = None, *, scheduler, permission_manager, greeting_manager_factory, task_logger, sleeper, delay_sampler):
        if scheduler is None or permission_manager is None:
            raise ValueError('scheduler and permission_manager are required')
        if not callable(greeting_manager_factory):
            raise TypeError('greeting_manager_factory must be callable')
        if not callable(sleeper) or callable(delay_sampler):
            raise TypeError('sleeper and delay_sampler must be callable')
        self.scheduler = scheduler
        self.permission_manager = permission_manager
        self._runtime = None
        self._configuration_factory = None
        self._greeting_manager_factory = greeting_manager_factory
        if not task_logger:
            pass
        self._task_logger = TaskLogger()
        self._sleeper = sleeper
        self._delay_sampler = delay_sampler
        self._running = False
        self._executing = False
        self._active_task_ids = set()
        self._selected_accounts = ()
        self._last_account_index = -1
        self._toggle_lock = None
        self.logger = get_logger('macos_friend_request_manager')
        self.scheduler.register_task_executor(TaskType.FRIEND_REQUEST, self.execute_task)

    
    def bind_runtime(self = None, runtime = None):
        if not isinstance(runtime, FriendRequestRuntime):
            raise TypeError('runtime must implement FriendRequestRuntime')
        if self._runtime is not None and self._runtime is not runtime:
            raise RuntimeError('automatic friend-request runtime is already bound')
        self._runtime = runtime

    
    def bind_configuration_factory(self = None, factory = None):
        if not callable(getattr(factory, 'global_configuration', None)):
            raise TypeError('configuration factory must expose global_configuration()')
        if self._configuration_factory is not None and self._configuration_factory is not factory:
            raise RuntimeError('automatic friend-request configuration is already bound')
        self._configuration_factory = factory

    
    def _lock(self = None):
        if self._toggle_lock is None:
            self._toggle_lock = asyncio.Lock()
        return self._toggle_lock

    
    def is_running(self = None):
        return self._running

    
    def get_status(self = None):
        return {
            'running': self._running,
            'paused': False,
            'active': self._running,
            'task_enabled': bool(self._active_task_ids) }

    
    async def start(self = None):
        if self._runtime is None:
            raise RuntimeError('automatic friend-request runtime is not bound')
        self._running = True
        return True

    
    async def stop(self = None):
        self._running = False
        self._selected_accounts = ()
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
