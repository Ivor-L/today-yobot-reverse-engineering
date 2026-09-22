# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_follow_adapter.marshal (Python 3.9)

__doc__ = '\n自动跟单任务适配器\n合并V2和V3版本的核心业务逻辑，采用标准的adapter模式\n'
import asyncio
import uuid
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union
from WeRobotCore.task_system_v3.types import TaskType, TaskStatus, TaskPriority, ScheduleConfig, TaskExecutionContext, TriggerType, ExecutionMode
from WeRobotCore.task_system_v2.base import BaseTask
# WARNING: Decompyle incomplete
