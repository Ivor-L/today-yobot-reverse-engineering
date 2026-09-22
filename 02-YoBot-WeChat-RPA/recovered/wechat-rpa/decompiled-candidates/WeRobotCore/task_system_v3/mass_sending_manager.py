# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: mass_sending_manager.marshal (Python 3.9)

__doc__ = '\n群发任务管理器 - Task System V3\n\n这个管理器提供了与 API 服务器集成的高级接口，\n用于管理群发任务的完整生命周期。\n'
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from uuid import uuid4
from WeRobotCore.task_system_v3.unified_scheduler import UnifiedScheduler
from WeRobotCore.task_system_v3.permission_manager import PermissionManager, get_permission_manager
from WeRobotCore.task_system_v3.mass_sending_adapter import MassSendingAdapter
from WeRobotCore.task_system_v3.types import TaskType, TaskStatus
from WeRobotCore.task_system_v3.unified_manager_pattern import BaseManagerV3
# WARNING: Decompyle incomplete
