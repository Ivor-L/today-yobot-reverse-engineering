# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: friend_request_manager.marshal (Python 3.9)

'''
自动通过好友任务管理器

提供与V2系统兼容的接口，同时支持V3的新特性和OrTrigger调度
'''
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from types import TaskType, TaskStatus, TaskPriority, PermissionLevel, PermissionRequest, TriggerType, ScheduleConfig, ExecutionMode
from friend_request_adapter import FriendRequestAdapter

class FriendRequestManager:
    '''自动通过好友任务管理器
    
    负责管理自动通过好友任务的生命周期，提供与V2系统兼容的接口
    '''
    
    def __init__(self, scheduler, permission_manager):
        '''初始化管理器
        
        Args:
            scheduler: 统一调度器实例
            permission_manager: 权限管理器实例
        '''
        self.scheduler = scheduler
        self.permission_manager = permission_manager
        self.adapter = FriendRequestAdapter(scheduler, permission_manager)
        self._active_tasks = { }
        self._task_configs = { }
        self._toggle_lock = asyncio.Lock()

    
    async def start(self = None):
        '''启动管理器'''
        pass
    # WARNING: Decompyle incomplete

    
    async def stop(self = None):
        '''停止管理器'''
        pass
    # WARNING: Decompyle incomplete

    
    async def pause(self = None):
        '''暂停管理器'''
        pass
    # WARNING: Decompyle incomplete

    
    async def resume(self = None):
        '''恢复管理器'''
        pass
    # WARNING: Decompyle incomplete

    
    def is_running(self = None):
        '''检查管理器是否运行中'''
        return self.adapter.is_running()

    
    def get_status(self = None):
        '''获取管理器状态'''
        adapter_status = self.adapter.get_status()
    # WARNING: Decompyle incomplete

    
    async def add_friend_request_task(self, params = None, schedule_time = None, schedule_config = None, task_id = (None, None, None, False), replace_existing = {
        'params': Dict[(str, Any)],
        'schedule_time': Optional[datetime],
        'schedule_config': Optional[ScheduleConfig],
        'task_id': Optional[str],
        'replace_existing': bool,
        'return': str }):
        '''添加自动通过好友任务（V2兼容接口）
        
        Args:
            params: 任务参数，包含：
                - maxFriendsPerDay: 每天最大好友数
                - maxProcessPerTime: 每次最大处理数
                - checkInterval: 检查间隔（分钟）
                - tag: 标签（可选）
                - greetingGroupId: 话术组ID（可选）
                - targetGroup: 目标群组（可选）
            schedule_time: 调度时间
            schedule_config: 调度配置（用于循环任务）
            task_id: 任务ID
            replace_existing: 是否替换现有的循环任务（默认False）
                
        Returns:
            str: 任务ID
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def stop_task(self = None, task_id = None):
        '''停止指定的自动通过好友任务
        
        Args:
            task_id: 任务ID
            
        Returns:
            bool: 是否成功停止
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def update_task_params(self = None, task_id = None, new_params = None):
        '''更新任务参数
        
        Args:
            task_id: 任务ID
            new_params: 新的任务参数
            
        Returns:
            bool: 是否成功更新
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def get_task_info(self = None, task_id = None):
        '''获取任务信息
        
        Args:
            task_id: 任务ID
            
        Returns:
            Optional[Dict[str, Any]]: 任务信息
        '''
        return self._active_tasks.get(task_id)

    
    def get_all_tasks(self = None):
        '''获取所有任务信息
        
        Returns:
            Dict[str, Dict[str, Any]]: 所有任务信息
        '''
        return self._active_tasks.copy()

    
    def get_task_config(self = None, task_id = None):
        '''获取任务配置
        
        Args:
            task_id: 任务ID
            
        Returns:
            Optional[Dict[str, Any]]: 任务配置
        '''
        return self._task_configs.get(task_id)

    
    def _validate_task_params(self = None, params = None):
        '''验证任务参数
        
        Args:
            params: 任务参数
            
        Raises:
            ValueError: 参数验证失败
        '''
        required_params = [
            'maxFriendsPerDay',
            'maxProcessPerTime',
            'checkInterval']
        for param in required_params:
            if param not in params:
                raise ValueError(f'''缺少必要参数: {param}''')
        if isinstance(params['maxFriendsPerDay'], int) or params['maxFriendsPerDay'] <= 0:
            raise ValueError('maxFriendsPerDay 必须是正整数')
        if isinstance(params['maxProcessPerTime'], int) or params['maxProcessPerTime'] <= 0:
            raise ValueError('maxProcessPerTime 必须是正整数')
        if isinstance(params['checkInterval'], int) or params['checkInterval'] <= 0:
            raise ValueError('checkInterval 必须是正整数')
        if not 'tag' in params and params['tag'] is not None and isinstance(params['tag'], str):
            raise ValueError('tag 必须是字符串')
        if not 'greetingGroupId' in params and params['greetingGroupId'] is not None and isinstance(params['greetingGroupId'], str):
            raise ValueError('greetingGroupId 必须是字符串')
        if not 'targetGroup' in params and params['targetGroup'] is not None and isinstance(params['targetGroup'], str):
            raise ValueError('targetGroup 必须是字符串')
        if not 'multiCycleEnabled' in params and params['multiCycleEnabled'] is not None and isinstance(params['multiCycleEnabled'], bool):
            raise ValueError('multiCycleEnabled 必须是布尔值')
        if not 'accountIds' in params and params['accountIds'] is not None and isinstance(params['accountIds'], list):
            raise ValueError('accountIds 必须是列表')

    
    async def toggle_friend_request_task(self = None, enable = None, params = None):
        '''切换自动通过好友任务状态（V2兼容接口）
        
        Args:
            enable: 是否启用
            params: 任务参数（启用时需要）
            
        Returns:
            Dict[str, Any]: 操作结果
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def _toggle_friend_request_task_locked(self = None, enable = None, params = None):
        '''在单例锁内完成旧任务清理与新任务创建。'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _cleanup_all_friend_request_tasks(self = None):
        '''清理所有好友请求任务（包括调度器中的遗留任务）
        
        Returns:
            int: 停止的任务数量
        '''
        stopped_count = 0
    # WARNING: Decompyle incomplete


