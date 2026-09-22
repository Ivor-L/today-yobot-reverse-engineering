# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_moment_post_manager.marshal (Python 3.9)

'''Windows-parity Moment-post orchestration backed by the macOS runtime.'''
from __future__ import annotations
from pathlib import Path
import shutil
from typing import Any, Dict, Mapping, Optional
from WeRobotCore.application.moment_post import MOMENT_MAX_MEDIA_FILES, MomentPostRuntime, collect_moment_media
from WeRobotCore.task_system_v3.moment_post_manager import MomentPostManager
from WeRobotCore.task_system_v3.types import TaskStatus
from WeRobotCore.utils.logger import TaskLogger, get_logger
from WeRobotCore.utils.moment_material_manager import MomentMaterialManager

class MacOSMomentPostTask:
    '''V2-shaped task facade without importing Windows WeChat/UIAutomation.'''
    
    def __init__(self = None, *, runtime, task_id, params, schedule_time, schedule_config, is_recurring, material_manager, task_logger):
        if not isinstance(runtime, MomentPostRuntime):
            raise TypeError('runtime must implement MomentPostRuntime')
        if not isinstance(params, Mapping):
            raise TypeError('params must be a mapping')
        self.id = task_id
        self.params = dict(params)
        self.schedule_time = schedule_time
        self.schedule_config = schedule_config
        self.is_recurring = bool(is_recurring)
        self.status = TaskStatus.PENDING
        self.error = None
        self._runtime = runtime
        if not material_manager:
            pass
        self._materials = MomentMaterialManager()
        if not task_logger:
            pass
        self._task_logger = TaskLogger()
        self._logger = get_logger('macos_moment_post_manager')

    
    def _used_groups(values = None):
