# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: types.marshal (Python 3.9)

'''
Task System V3 类型定义

定义了新调度系统的核心类型，保持与v2的兼容性
'''
from enum import Enum
from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime
from dataclasses import dataclass

def _get_v2_types():
    '''延迟导入 v2 系统类型'''
    pass
# WARNING: Decompyle incomplete

(TaskType, TaskPriority, TaskStatus, BaseTask, TimedBaseTask) = _get_v2_types()

class SchedulerType(Enum):
    '''调度器类型'''
    AUTO_REPLY = 'auto_reply'
    TIMED_TASK = 'timed_task'
    UNIFIED = 'unified'


class ExecutionMode(Enum):
    '''任务执行模式'''
    IMMEDIATE = 'immediate'
    SCHEDULED = 'scheduled'
    RECURRING = 'recurring'


class TriggerType(Enum):
    '''触发器类型'''
    DATE = 'date'
    INTERVAL = 'interval'
    CRON = 'cron'
    OR_TRIGGER = 'or_trigger'

ScheduleConfig = dataclass(<NODE:12>)
TaskExecutionContext = dataclass(<NODE:12>)
TaskExecutor = Callable[([
    TaskExecutionContext,
    Dict[(str, Any)]], Awaitable[Any])]

class PermissionLevel(Enum):
    '''权限级别'''
    EXCLUSIVE = 'exclusive'
    SHARED = 'shared'
    BACKGROUND = 'background'

PermissionRequest = dataclass(<NODE:12>)

class SchedulerState(Enum):
    '''调度器状态'''
    STOPPED = 'stopped'
    STARTING = 'starting'
    RUNNING = 'running'
    PAUSING = 'pausing'
    PAUSED = 'paused'
    STOPPING = 'stopping'
    ERROR = 'error'

SchedulerStatus = dataclass(<NODE:12>)
