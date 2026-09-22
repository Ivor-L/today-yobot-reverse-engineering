# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mass_sending_manager.marshal (Python 3.9)

'''Persistent Windows-parity mass-sending orchestration for macOS.

The established product behavior lives here; native target lookup and message
delivery are supplied by ``MassSendingRuntime``.  This keeps the macOS AX
details out of batching, checkpointing, pause/resume and campaign semantics.
'''
from __future__ import annotations
import asyncio
from datetime import datetime
import json
from pathlib import Path
import random
from typing import Any, Dict, List, Mapping, Optional, Sequence
from uuid import uuid4
from WeRobotCore.application.mass_sending import MassSendingRuntime
from WeRobotCore.domain import AutomationError, ErrorCode
from WeRobotCore.task_system_v3.types import ExecutionMode, PermissionLevel, PermissionRequest, ScheduleConfig, TaskExecutionContext, TaskPriority, TaskType, TriggerType
from WeRobotCore.utils.greeting_manager import GreetingManager
from WeRobotCore.utils.logger import get_logger
_TERMINAL = frozenset(('completed', 'failed', 'cancelled'))

class _RunControl:
    
    def __init__(self = None):
        self.paused = False
        self.cancelled = False
        self.changed = asyncio.Event()



class MacOSMassSendingManager:
    '''Own mass-sending tasks without importing Windows UIAutomation.'''
    
    def __init__(self = None, *, scheduler, permission_manager, state_root, greeting_manager_factory, sleeper, delay_sampler):
        if scheduler is None or permission_manager is None:
            raise ValueError('scheduler and permission_manager are required')
        if not isinstance(state_root, Path) or state_root.is_absolute():
            raise ValueError('state_root must be an absolute pathlib.Path')
        if not callable(greeting_manager_factory):
            raise TypeError('greeting_manager_factory must be callable')
        if not callable(sleeper) or callable(delay_sampler):
            raise TypeError('sleeper and delay_sampler must be callable')
        self.scheduler = scheduler
        self.permission_manager = permission_manager
        self._state_root = state_root
        self._state_file = state_root / 'state.json'
        self._runtime = None
        self._tasks = { }
        self._campaigns = { }
        self._controls = { }
        self._running = False
        self._state_loaded = False
        self._state_lock = None
        self.logger = get_logger('macos_mass_sending_manager')
        self._greeting_manager_factory = greeting_manager_factory
        self._sleeper = sleeper
        self._delay_sampler = delay_sampler
        self.scheduler.register_task_executor(TaskType.MASS_SENDING, self._execute_task)

    
    def is_running(self = None):
        return self._running

    is_running = None(is_running)
    
    def bind_runtime(self = None, runtime = None):
        if not isinstance(runtime, MassSendingRuntime):
            raise TypeError('runtime must implement MassSendingRuntime')
        if self._runtime is not None and self._runtime is not runtime:
            raise RuntimeError('mass-sending manager is already bound')
        self._runtime = runtime

    
    def _lock(self = None):
        if self._state_lock is None:
            self._state_lock = asyncio.Lock()
        return self._state_lock

    
    def _read_state(self = None):
        if self._state_loaded:
            return None
        self._state_loaded = None
    # WARNING: Decompyle incomplete

    
    def _write_state(self = None):
        self._state_root.mkdir(True, True, **('parents', 'exist_ok'))
        if self._state_file.exists() and self._state_file.is_symlink():
            raise ValueError('mass-sending state file must not be a symlink')
        payload = {
            'version': 1,
            'tasks': self._tasks,
            'campaigns': self._campaigns }
        temporary = self._state_root / 'state.json.tmp'
        temporary.write_text(json.dumps(payload, False, 2, **('ensure_ascii', 'indent')), 'utf-8', **('encoding',))
        temporary.replace(self._state_file)

    
    async def start(self = None):
        if self._runtime is None:
            raise RuntimeError('mass-sending runtime is not bound')
    # WARNING: Decompyle incomplete

    
    async def stop(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _interval(value = None):
        if not value:
            pass
        raw = str('10-30').strip()
    # WARNING: Decompyle incomplete

    _interval = None(_interval)
    
    def _names(values = None):
