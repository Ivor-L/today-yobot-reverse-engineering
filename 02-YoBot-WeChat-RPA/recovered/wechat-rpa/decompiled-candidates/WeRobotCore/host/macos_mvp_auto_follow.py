# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_auto_follow.marshal (Python 3.9)

'''Legacy Vue automatic-follow API over the process-owned macOS manager.'''
from __future__ import annotations
import hmac
from typing import List, Literal, Optional, Union
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_auto_follow_installed'

class MacOSAutoFollowFriend(BaseModel):
    nickname: 'str' = ConfigDict('forbid', **('extra',))
    chat_type: "Literal['single', 'group']" = 'single'


class MacOSAutoFollowRequest(BaseModel):
    agent_id: 'str' = ConfigDict('forbid', **('extra',))
    follow_scenario: 'str' = '新好友'
    follow_days: 'int' = Field(7, 1, 365, **('default', 'ge', 'le'))
    follow_frequency: 'Union[str, int]' = 1
    time_range_start: 'str' = '09:00'
    time_range_end: 'str' = '18:00'
    chat_type: "Literal['single', 'group']" = 'single'
    first_run_next_day: 'bool' = False


class MacOSBatchAutoFollowRequest(BaseModel):
    agent_id: 'str' = ConfigDict('forbid', **('extra',))
    follow_scenario: 'str' = '新好友'
    follow_days: 'int' = Field(7, 1, 365, **('default', 'ge', 'le'))
    follow_frequency: 'Union[str, int]' = 1
    time_range_start: 'str' = '09:00'
    time_range_end: 'str' = '18:00'
    first_run_next_day: 'bool' = False


class MacOSBatchCancelAutoFollowRequest(BaseModel):
    task_ids: 'List[str]' = ConfigDict('forbid', **('extra',))


class MacOSBatchUpdateAutoFollowAgentRequest(BaseModel):
    agent_id: 'str' = ConfigDict('forbid', **('extra',))


def create_macos_mvp_auto_follow_router(*, manager, api_key):
    if manager is None:
        raise ValueError('manager is required')
    required = ('create_auto_follow_task', 'create_batch_auto_follow_tasks', 'cancel_auto_follow_task', 'pause_auto_follow_task', 'resume_auto_follow_task', 'get_tasks_by_account', 'get_auto_follow_task_info', 'batch_cancel_auto_follow_tasks', 'batch_update_auto_follow_agent', 'find_auto_follow_tasks', 'get_execution_logs')
    for method in required:
        if not callable(getattr(manager, method, None)):
            raise TypeError('manager must expose {}()'.format(method))
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be non-empty text')
    header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented = None):
        if not presented:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, {
                'code': 'MACOS_MVP_API_KEY_INVALID',
                'message': 'invalid API key' }, **('status_code', 'detail'))
        return presented

    
    def response(result = None, not_found = None):
        if result.get('success'):
            return result
        return None(404 if not_found else 400, result, **('status_code', 'content'))

    router = APIRouter()
    
    async def create_task(request = None, _key = None):
        await manager.create_auto_follow_task({
            'account_id': request.account_id,
            'friend_wxid': request.friend_wxid,
            'friend_name': request.friend_nickname,
            'agent_id': request.agent_id,
            'follow_scenario': request.follow_scenario,
            'follow_days': request.follow_days,
            'follow_frequency': request.follow_frequency,
            'time_range_start': request.time_range_start,
            'time_range_end': request.time_range_end,
            'chat_type': request.chat_type,
            'first_run_next_day': request.first_run_next_day })
        return response(<NODE:28>)

    create_task = None(create_task)
    
    async def create_batch(request = None, _key = None):
        await manager.create_batch_auto_follow_tasks({
            'account_id': request.account_id,
            'friend_list': (lambda .0: [ item.model_dump() for item in .0 ])(request.friends),
            'agent_id': request.agent_id,
            'follow_scenario': request.follow_scenario,
            'follow_days': request.follow_days,
            'follow_frequency': request.follow_frequency,
            'time_range_start': request.time_range_start,
            'time_range_end': request.time_range_end,
            'first_run_next_day': request.first_run_next_day })
        return response(<NODE:28>)

    create_batch = None(create_batch)
    
    async def list_tasks(_key = None):
        await manager.get_tasks_by_account('')
        return <NODE:28>

    list_tasks = None(list_tasks)
    
    async def list_logs(_key = None):
        await manager.get_execution_logs()
        return <NODE:28>

    list_logs = None(list_logs)
    
    async def find_tasks(date = None, agent_id = None, _key = None):
        await manager.find_auto_follow_tasks(agent_id, date, **('agent_id', 'date_str'))
        return <NODE:28>

    find_tasks = None(find_tasks)
    
    async def cancel_batch(request = None, _key = None):
        await manager.batch_cancel_auto_follow_tasks(request.task_ids)
        return response(<NODE:28>)

    cancel_batch = None(cancel_batch)
    
    async def update_batch_agent(request = None, _key = None):
        await manager.batch_update_auto_follow_agent(request.task_ids, request.agent_id)
        return response(<NODE:28>)

    update_batch_agent = None(update_batch_agent)
    
    async def cancel_task(task_id = None, _key = None):
        await manager.cancel_auto_follow_task(task_id)
        return response(<NODE:28>)

    cancel_task = None(cancel_task)
    
    async def pause_task(task_id = None, _key = None):
        await manager.pause_auto_follow_task(task_id)
        return response(<NODE:28>)

    pause_task = None(pause_task)
    
    async def resume_task(task_id = None, _key = None):
        await manager.resume_auto_follow_task(task_id)
        return response(<NODE:28>)

    resume_task = None(resume_task)
    
    async def get_task(task_id = None, _key = None):
        await manager.get_auto_follow_task_info(task_id)
        return response(<NODE:28>, True, **('not_found',))

    get_task = None(get_task)
    return router


def install_macos_mvp_auto_follow_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS automatic-follow routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for item in .0:
item.available)(states.values())):
        raise RuntimeError('macOS automatic-follow routes require the complete capability catalog')
    manager = runtime.dependencies.auto_follow_manager
    if manager is None:
        raise RuntimeError('the macOS process has no automatic-follow manager')
    frontend = tuple((lambda .0: 