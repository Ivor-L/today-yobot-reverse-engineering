# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moment_post_manager.marshal (Python 3.9)

from typing import Any, Callable, Dict, Optional
from datetime import datetime
from WeRobotCore.task_system_v3.unified_manager_pattern import BaseManagerV3
from WeRobotCore.task_system_v3.types import ScheduleConfig, TriggerType, ExecutionMode, TaskType
from WeRobotCore.task_system_v3.moment_post_adapter import MomentPostAdapter

class MomentPostManager(BaseManagerV3):
    
    def __init__(self = None, scheduler = None, permission_manager = None, task_factory = None):
        super().__init__(scheduler, permission_manager)
        if scheduler is None:
            UnifiedScheduler = UnifiedScheduler
            import WeRobotCore.task_system_v3.unified_scheduler
            self.scheduler = UnifiedScheduler()
        if permission_manager is None:
            get_permission_manager = get_permission_manager
            import WeRobotCore.task_system_v3.permission_manager
            self.permission_manager = get_permission_manager()
        self.adapter = MomentPostAdapter(self.scheduler, self.permission_manager, task_factory, **('task_factory',))
        self._is_running = False
        self._startup_time = None

    
    async def start(self = None):
        if self._is_running:
            return True
        await None.adapter.start()
        ok = <NODE:28>
        if not ok:
            return False
        self._is_running = None
        self._startup_time = datetime.now()
        return True

    
    async def stop(self = None):
        self._is_running = False
        return True

    
    async def pause(self = None):
        return True

    
    async def resume(self = None):
        return True

    
    def get_status(self = None):
        return {
            'is_running': self._is_running,
            'startup_time': self._startup_time.isoformat() if self._startup_time else None }

    
    async def create_tasks(self = None, params = None):
        await self.start()
        await self.adapter.create_moment_post_task(params)
        return <NODE:28>

    
    async def post_moment_direct(self = None, content = None, material_folder = None, account_id = (None, False), cleanup_material_folder = {
        'content': str,
        'material_folder': str,
        'account_id': Optional[str],
        'cleanup_material_folder': bool,
        'return': Dict[(str, Any)] }):
        await self.start()
        await self.adapter.create_moment_post_task_from_agent(content, material_folder, account_id, cleanup_material_folder, **('account_id', 'cleanup_material_folder'))
        return <NODE:28>

    
    async def get_tasks(self = None):
        await self.start()
        await self.adapter.get_moment_post_tasks()
        return <NODE:28>

    
    async def cancel_task(self = None, task_id = None):
        await self.start()
        await self.adapter.cancel_moment_post_task(task_id)
        return <NODE:28>

    __classcell__ = None

