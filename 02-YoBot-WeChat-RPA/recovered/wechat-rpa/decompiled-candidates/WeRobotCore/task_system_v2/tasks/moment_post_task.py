# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moment_post_task.marshal (Python 3.9)

import shutil
import os
from uuid import uuid4
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path
from click.core import F
from base import TimedBaseTask, TaskType, TaskStatus, TaskPriority
from core.WeChatType import WeChat
from utils.moment_material_manager import MomentMaterialManager
from utils.logger import TaskLogger

class MomentPostTask(TimedBaseTask):
    
    def __init__(self = None, task_id = None, params = None, schedule_time = None, schedule_config = None, is_recurring = None):
        super().__init__(task_id, TaskType.MOMENT_POST, params, schedule_time, TaskPriority.MEDIUM, schedule_config, is_recurring, **('task_id', 'task_type', 'params', 'schedule_time', 'priority', 'schedule_config', 'is_recurring'))
        self.account_id = self.params.get('account')
        self.wechat = WeChat(self.account_id)
        self.status = TaskStatus.PENDING
        self.material_manager = MomentMaterialManager()
        self.task_logger = TaskLogger()

    
    async def execute(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _collect_media_files(self = None, group_path = None):
