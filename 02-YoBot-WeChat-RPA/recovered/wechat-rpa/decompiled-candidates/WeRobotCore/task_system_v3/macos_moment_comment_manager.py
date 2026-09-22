# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_moment_comment_manager.marshal (Python 3.9)

'''Process-owned macOS Moments manager using the shared V3 scheduler.'''
from __future__ import annotations
import asyncio
from contextlib import suppress
from typing import Any, Dict, Mapping, Optional
from WeRobotCore.application.moments import MomentCommentRuntime, MomentCommentWorkflow
from WeRobotCore.task_system_v3.moment_comment_manager import MomentCommentManager
from WeRobotCore.task_system_v3.types import TaskStatus
from WeRobotCore.utils.logger import get_logger
from WeRobotCore.utils.macos_emergency_stop import MacOSControlHoldEmergencyStop

class MacOSMomentCommentTask:
    '''V2-shaped task facade backed only by the cross-platform workflow.'''
    
    def __init__(self = None, *, runtime, task_id, params, schedule_time, schedule_config, is_recurring, emergency_stop):
        if not isinstance(runtime, MomentCommentRuntime):
            raise TypeError('runtime must implement MomentCommentRuntime')
        if not isinstance(params, Mapping):
            raise TypeError('params must be a mapping')
        if params.get('agentId') or 'commentLimit' not in params:
            raise ValueError('缺少必要参数：commentLimit、agentId')
        self.id = task_id
        self.params = dict(params)
        self.schedule_time = schedule_time
        self.schedule_config = schedule_config
        self.is_recurring = bool(is_recurring)
        self.status = TaskStatus.PENDING
        self.error = None
        self._cancelled = False
        self._progress_callback = None
        self._workflow = MomentCommentWorkflow(runtime)
        self._logger = get_logger('macos_moment_comment_manager')
        self._emergency_stop = emergency_stop if emergency_stop is not None else MacOSControlHoldEmergencyStop()
        if not callable(getattr(self._emergency_stop, 'poll', None)):
            raise TypeError('emergency_stop must expose poll()')
        self._emergency_stop_announced = False

    
    def cancel(self = None):
        self._cancelled = True
        self.status = TaskStatus.CANCELLED
        self.error = '任务被用户手动取消'

    
    def _account_id(self = None):
        if not self.params.get('accountId'):
            pass
        explicit = str('').strip()
        if explicit:
            return explicit
        if not None.params.get('selectedAccounts'):
            pass
        selected = ()
        if isinstance(selected, (list, tuple)) and selected:
            if not selected[0]:
                pass
            return str('').strip()

    
    def _is_cancelled(self = None):
        if self._cancelled:
            return True
        if not None._emergency_stop.poll():
            return False
        self._cancelled = None
        self.error = '检测到长按 Esc/Control，朋友圈任务已紧急停止'
        if not self._emergency_stop_announced:
            self._emergency_stop_announced = True
            self._logger.warning(self.error)
        return True

    
    async def _watch_emergency_stop(self = None):
        if not self._cancelled:
            if self._is_cancelled():
                return None
            await None.sleep(0.05)
            continue

    
    async def execute(self = None):
        self.status = TaskStatus.RUNNING
        self._emergency_stop_announced = False
        reset = getattr(self._emergency_stop, 'reset', None)
        if callable(reset):
            reset()
        emergency_watcher = asyncio.create_task(self._watch_emergency_stop())
        
        def callback(detail = None):
            if isinstance(detail, Mapping):
                if not detail.get('type'):
                    pass
                kind = str('info').lower()
                if not detail.get('message'):
                    pass
                message = str('').strip()
                if message:
                    if kind == 'error':
                        self._logger.error(message)
                    elif kind == 'warning':
                        self._logger.warning(message)
                    else:
                        self._logger.info(message)
            progress = self._progress_callback
            if callable(progress):
                progress(detail)

    # WARNING: Decompyle incomplete



class MacOSMomentCommentManager(MomentCommentManager):
    '''Reuse mature toggle/schedule behavior while replacing Windows UIA.'''
    
    def __init__(self = None, *, scheduler, permission_manager):
        self._runtime = None
        
        def create_task(**kwargs):
            if self._runtime is None:
                raise RuntimeError('macOS Moments runtime is not bound')
        # WARNING: Decompyle incomplete

        super().__init__(scheduler, permission_manager, create_task, **('scheduler', 'permission_manager', 'task_factory'))

    
    def bind_runtime(self = None, runtime = None):
        if not isinstance(runtime, MomentCommentRuntime):
            raise TypeError('runtime must implement MomentCommentRuntime')
        if self._runtime is not None and self._runtime is not runtime:
            raise RuntimeError('macOS Moments manager is already bound')
        self._runtime = runtime

    
    async def start(self = None):
        if self._runtime is None:
            raise RuntimeError('macOS Moments runtime is not bound')
        await super().start()
        return <NODE:28>

    __classcell__ = None

__all__ = [
    'MacOSMomentCommentManager',
    'MacOSMomentCommentTask']
