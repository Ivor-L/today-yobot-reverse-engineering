# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_mass_sending.marshal (Python 3.9)

'''Legacy Vue mass-sending API over the process-owned macOS manager.'''
from __future__ import annotations
from datetime import datetime
import hmac
from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_mass_sending_installed'

class MacOSMassSendingRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    tagIds: 'List[str]' = Field(list, **('default_factory',))
    selectedFriends: 'List[str]' = Field(list, **('default_factory',))
    selectedGroups: 'List[str]' = Field(list, **('default_factory',))
    greetingGroupId: 'str' = ''
    timeType: "Literal['now', 'immediate', 'schedule']" = 'now'
    contentType: "Literal['greeting', 'agent']" = 'greeting'
    agentId: 'str' = ''
    account_id: 'Optional[str]' = None
    dayOffset: 'int' = 0
    time: 'Optional[datetime]' = None
    sendInterval: 'str' = '10-30'
    autoGrouping: 'bool' = False
    batchSize: 'int' = 10


def create_macos_mvp_mass_sending_router(*, manager, api_key):
    if manager is None:
        raise ValueError('manager is required')
    for method in ('create_mass_sending_task', 'get_all_mass_sending_tasks', 'pause_task', 'resume_task', 'cancel_mass_sending_task', 'list_campaigns', 'get_campaign_status', 'resume_campaign', 'cancel_campaign'):
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

    router = APIRouter()
    
    async def create_task(request = None, _key = None):
        targets = list(request.selectedFriends) + list(request.selectedGroups)
        await manager.create_mass_sending_task(request.tagIds, request.greetingGroupId, request.timeType, targets, request.contentType, request.agentId, request.account_id, request.time if request.timeType == 'schedule' else None, request.sendInterval, request.autoGrouping, request.batchSize, **('tag_ids', 'greeting_group_id', 'time_type', 'selected_friends', 'content_type', 'agent_id', 'account_id', 'schedule_time', 'send_interval', 'auto_grouping', 'batch_size'))
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    create_task = None(create_task)
    
    async def list_tasks(_key = None):
        await manager.get_all_mass_sending_tasks()
        tasks = <NODE:28>
        running = (lambda .0: [ item for item in .0 if item.get('status') == 'running' ])(tasks)
        pending = (lambda .0: [ item for item in .0 if item.get('status') != 'running' ])(tasks)
        return {
            'success': True,
            'data': {
                'running': running,
                'pending': pending } }

    list_tasks = None(list_tasks)
    
    async def list_campaigns(include_terminal = None, _key = None):
        await manager.list_campaigns(include_terminal)
        return {
            'success': True,
            'campaigns': <NODE:28> }

    list_campaigns = None(list_campaigns)
    
    async def get_campaign(campaign_id = None, _key = None):
        await manager.get_campaign_status(campaign_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(404, result, **('status_code', 'content'))

    get_campaign = None(get_campaign)
    
    async def resume_campaign(campaign_id = None, _key = None):
        await manager.resume_campaign(campaign_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    resume_campaign = None(resume_campaign)
    
    async def cancel_campaign(campaign_id = None, _key = None):
        await manager.cancel_campaign(campaign_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    cancel_campaign = None(cancel_campaign)
    
    async def pause_all(_key = None):
        await manager.pause_all_tasks()
        return <NODE:28>

    pause_all = None(pause_all)
    
    async def cancel_all(_key = None):
        await manager.cancel_all_pending_tasks()
        return <NODE:28>

    cancel_all = None(cancel_all)
    
    async def pause_task(task_id = None, _key = None):
        await manager.pause_task(task_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    pause_task = None(pause_task)
    
    async def resume_task(task_id = None, _key = None):
        await manager.resume_task(task_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    resume_task = None(resume_task)
    
    async def cancel_task(task_id = None, _key = None):
        await manager.cancel_mass_sending_task(task_id)
        result = <NODE:28>
        if result.get('success'):
            return result
        return None(400, result, **('status_code', 'content'))

    cancel_task = None(cancel_task)
    return router


def install_macos_mvp_mass_sending_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS mass-sending routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for state in .0:
state.available)(states.values())):
        raise RuntimeError('macOS mass-sending routes require the complete capability catalog')
    manager = runtime.dependencies.mass_sending_manager
    if manager is None:
        raise RuntimeError('the macOS process has no mass-sending manager')
    frontend_routes = tuple((lambda .0: 