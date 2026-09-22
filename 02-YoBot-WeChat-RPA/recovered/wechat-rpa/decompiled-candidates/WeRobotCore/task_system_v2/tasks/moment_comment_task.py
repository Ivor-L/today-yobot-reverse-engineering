# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moment_comment_task.marshal (Python 3.9)

from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional
from base import TimedBaseTask, TaskType, TaskStatus, TaskPriority
from core.WeChatType import WeChat
from utils.logger import TaskLogger
import asyncio
from websocket_manager import websocket_manager

class MomentCommentTask(TimedBaseTask):
    
    def __init__(self = None, task_id = None, params = None, schedule_time = None, is_persistent = None, schedule_config = None, is_recurring = None):
        required_params = [
            'commentLimit',
            'agentId']
        if not None((lambda .0 = None: for key in .0:
key in params)(required_params)):
            raise ValueError(f'''缺少必要参数：{required_params}''')
        super().__init__(task_id, TaskType.MOMENT_COMMENT, params, schedule_time, TaskPriority.MEDIUM, schedule_config, is_recurring, **('task_id', 'task_type', 'params', 'schedule_time', 'priority', 'schedule_config', 'is_recurring'))
        print(f'''执行朋友圈评论任务，账号：{params.get('accountId')}''')
        self.wechat = WeChat(params.get('accountId'), **('account_id',)) if params.get('accountId') else WeChat()
        self.task_logger = TaskLogger()
        self.status = TaskStatus(params.get('status', 'pending'))
        self.is_persistent = is_persistent
        self._cancelled = False

    
    def cancel(self):
        '''取消任务'''
        self._cancelled = True
        self.status = TaskStatus.CANCELLED
        self.error = '任务被用户手动取消'
        print(f'''朋友圈评论任务 {self.id} 已收到取消信号''')

    
    async def _get_friends_by_tags(self = None, tag_ids = None):
        '''根据标签ID获取好友名称列表'''
        pass
    # WARNING: Decompyle incomplete

    
    def _is_rest_time(self = None):
        '''检查当前时间是否在休息时间段内'''
        pass
    # WARNING: Decompyle incomplete

    
    async def execute(self = None):
        '''执行朋友圈评论任务'''
        pass
    # WARNING: Decompyle incomplete

    
    def _get_collect_wx_id_setting(self = None):
        '''获取客户的collect_wx_id配置'''
        pass
    # WARNING: Decompyle incomplete

    __classcell__ = None

