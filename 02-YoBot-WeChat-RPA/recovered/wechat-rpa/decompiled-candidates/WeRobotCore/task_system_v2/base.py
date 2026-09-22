# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: base.marshal (Python 3.9)

from enum import Enum
from typing import Dict, Any, Optional
from datetime import datetime

class TaskType(Enum):
    AUTO_REPLY = 'auto_reply'
    FRIEND_REQUEST = 'friend_request'
    MASS_SENDING = 'mass_sending'
    TIMED_TASK = 'timed_task'
    ADD_FRIEND = 'add_friend'
    MOMENT_COMMENT = 'moment_comment'
    MOMENT_POST = 'moment_post'
    CHAT_COLLECTION = 'chat_collection'
    AUTO_FOLLOW = 'auto_follow'
    SYNC_CONTACTS = 'sync_contacts'
    SOP_FLOW = 'sop_flow'


class TaskPriority(Enum):
    LOW = 0
    MEDIUM = 1
    HIGH = 2


class TaskStatus(Enum):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETED = 'completed'
    FAILED = 'failed'
    CANCELLED = 'cancelled'
    PENDING_CONFIRMATION = 'pending_confirmation'
    PAUSED = 'paused'
    PENDING_AGENT = 'pending_agent'


class BaseTask:
    
    def __init__(self, task_id = None, task_type = None, params = None, schedule_time = (None, TaskPriority.MEDIUM), priority = {
        'task_id': str,
        'task_type': TaskType,
        'params': Dict[(str, Any)],
        'schedule_time': Optional[datetime],
        'priority': TaskPriority }):
        self.id = task_id
        self.type = task_type
        self.params = params
        self.schedule_time = schedule_time
        self.priority = priority
        self.status = TaskStatus.PENDING
        self.error = None
        self.result = None
        self.created_at = datetime.now()
        self.started_at = None
        self.completed_at = None
        self.run_index = 1
        self.correlation_id = f'''corr_{task_id}_run1'''

    
    async def execute(self = None):
        '''执行任务的抽象方法'''
        raise NotImplementedError

    
    def to_dict(self = None):
        '''将任务转换为字典格式'''
        return {
            'id': self.id,
            'type': self.type.value,
            'params': self.params,
            'schedule_time': self.schedule_time.isoformat() if self.schedule_time else None,
            'priority': self.priority.value,
            'status': self.status.value,
            'error': str(self.error) if self.error else None,
            'result': self.result,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None }



class TimedBaseTask(BaseTask):
    '''定时任务基类'''
    
    def __init__(self = None, task_id = None, task_type = None, params = None, schedule_time = None, schedule_config = None, is_recurring = None, priority = None):
        super().__init__(task_id, task_type, params, priority)
        self.schedule_time = schedule_time
        if not schedule_config:
            pass
        self.schedule_config = { }
        self.is_recurring = is_recurring

    
    def to_dict(self = None):
        data = super().to_dict()
        data.update({
            'schedule_time': self.schedule_time.isoformat() if self.schedule_time else None,
            'schedule_config': self.schedule_config,
            'is_recurring': self.is_recurring })
        return data

    __classcell__ = None

