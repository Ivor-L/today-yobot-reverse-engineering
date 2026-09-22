# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_friend_request.marshal (Python 3.9)

'''Legacy Vue automatic friend-request API over the macOS manager.'''
from __future__ import annotations
import hmac
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_friend_request_installed'

class MacOSFriendRequestSettings(BaseModel):
    enabled: 'bool' = ConfigDict('forbid', **('extra',))
    maxFriendsPerDay: 'int' = Field(100, 1, 100, **('default', 'ge', 'le'))
    checkInterval: 'int' = Field(10, 1, 1440, **('default', 'ge', 'le'))
    maxProcessPerTime: 'int' = Field(5, 1, 20, **('default', 'ge', 'le'))
    targetGroup: 'Optional[str]' = Field(None, 256, **('default', 'max_length'))
    tag: 'Optional[str]' = Field(None, 20, **('default', 'max_length'))
    greetingGroupId: 'Optional[str]' = Field(None, 256, **('default', 'max_length'))
    multiCycleEnabled: 'bool' = False
    accountIds: 'List[str]' = Field(list, 100, **('default_factory', 'max_length'))


def create_macos_mvp_friend_request_router(*, manager, api_key):
    if manager is None:
        raise ValueError('manager is required')
    for method in ('toggle_friend_request_task', 'get_logs'):
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
    
    async def toggle(settings = None, _key = None):
        params = None
        if settings.enabled:
            if not settings.tag:
                pass
            if not settings.greetingGroupId:
                pass
            if not settings.targetGroup:
                pass
            params = {
                'maxFriendsPerDay': settings.maxFriendsPerDay,
                'maxProcessPerTime': settings.maxProcessPerTime,
                'tag': '',
                'checkInterval': settings.checkInterval,
                'greetingGroupId': '',
                'targetGroup': '',
                'multiCycleEnabled': settings.multiCycleEnabled,
                'accountIds': settings.accountIds }
        await manager.toggle_friend_request_task(settings.enabled, params)
        result = <NODE:28>
        if not result.get('success'):
            return JSONResponse(500, {
                'success': False,
                'error': result.get('message', '操作失败') }, **('status_code', 'content'))
        return {
            'success': None,
            'data': {
                'task_id': result.get('task_id'),
                'status': 'pending' if settings.enabled else 'cancelled',
                'message': result.get('message', ''),
                'params': params } }

    toggle = None(toggle)
    
    async def logs(_key = None):
        await manager.get_logs()
        return {
            'success': True,
            'data': list(<NODE:28>) }

    logs = None(logs)
    return router


def install_macos_mvp_friend_request_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS automatic friend-request routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for item in .0:
item.available)(states.values())):
        raise RuntimeError('macOS automatic friend-request routes require the complete capability catalog')
    manager = runtime.dependencies.friend_request_manager
    if manager is None:
        raise RuntimeError('the macOS process has no automatic friend-request manager')
    frontend = tuple((lambda .0: 