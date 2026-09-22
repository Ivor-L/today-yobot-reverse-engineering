# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_startup.marshal (Python 3.9)

'''Classic Startup compatibility over the shared Startup service.

The shared Vue Startup page keeps the mature Windows HTTP contract.  This
adapter projects only its single-instance launch and initialization calls onto
the platform-neutral Startup workflow already owned by the macOS Control.  It
contains no AX/native automation and is never installed by Windows.
'''
from __future__ import annotations
import hmac
from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from WeRobotCore.application.startup import StartupAction, StartupCommand, StartupExecutionResult, StartupWorkflowService
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
MACOS_MVP_INITIALIZE_PATH = '/api/init/multi'
MACOS_MVP_LAUNCH_PATH = '/api/system/wechat/launch'
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_startup_installed'

class MacOSMvpLaunchRequest(BaseModel):
    count: 'int' = Field(1, 1, 10, **('default', 'ge', 'le'))
    close_existing: 'bool' = False
    enable_narrator: 'bool' = False


def _guidance(result = None):
    snapshot = result.snapshot
    if snapshot is None or snapshot.guidance is None:
        return None
    guidance = None.guidance
    return {
        'title': guidance.title,
        'reason': guidance.reason,
        'fix_steps': list(guidance.steps),
        'download_url': guidance.action_url,
        'download_label': guidance.action_label }


def _initialization_payload(result = None):
    snapshot = result.snapshot
    ready = tuple(snapshot.instances) if result.success and snapshot else ()
    instances = (lambda .0 = None: [ {
'instance_id': item.instance_id,
'window_handle': 0,
'api_port': 0,
'nickname': item.nickname,
'account_id': item.account_id,
'account_info': {
'nickname': item.nickname,
'account_id': item.account_id },
'is_active': len(ready) == 1,
'is_connected': True,
'manually_exited': False,
'accessibility_method': 'macos_ax_hot_attach' } for item in .0 ])(ready)
    payload = {
        'success': result.success,
        'message': result.message,
        'instances': instances,
        'init_summary': {
            'total': len(snapshot.instances) if snapshot else 0,
            'success': len(instances),
            'failed': len(snapshot.instances) - len(instances) if snapshot else 0 } }
    if not result.success:
        if not result.reason_code:
            pass
        payload['code'] = result.code.value
        payload['error_detail'] = result.message
    guidance = _guidance(result)
    if guidance is not None:
        payload['guidance'] = guidance
    return payload


def create_macos_mvp_startup_router(*, service, api_key):
    '''Project classic Startup paths without selecting native behavior.'''
    if not isinstance(service, StartupWorkflowService):
        raise TypeError('service must be a StartupWorkflowService')
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be a non-empty string')
    api_key_header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented_key = None):
        if not presented_key:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, 'invalid API key', **('status_code', 'detail'))
        return presented_key

    router = APIRouter()
    
    async def initialize_macos_mvp_wechat(_request = None, _api_key = None):
        await service.execute(StartupCommand(StartupAction.INITIALIZE, **('action',)))
        result = <NODE:28>
        return _initialization_payload(result)

    initialize_macos_mvp_wechat = None(initialize_macos_mvp_wechat)
    
    async def launch_macos_mvp_wechat(request = None, _api_key = None):
        if request.enable_narrator:
            return {
                'status': 'error',
                'code': 'MACOS_COMPATIBILITY_CONFIGURATION_UNAVAILABLE',
                'message': 'Mac 不使用 Windows 讲述人兼容配置' }
        await None.execute(StartupCommand(StartupAction.LAUNCH, request.count, request.close_existing, **('action', 'launch_count', 'close_existing')))
        result = <NODE:28>
        if result.success:
            pass
        elif not result.reason_code:
            pass
        return {
            'status': result.reason_code,
            'code': result.code.value,
            'launched_count': request.count if result.success else 0,
            'closed_count': 0,
            'enable_narrator': False,
            'message': result.message }

    launch_macos_mvp_wechat = None(launch_macos_mvp_wechat)
    return router


def install_macos_mvp_startup_routes(runtime = None):
    '''Install Startup compatibility for the complete capability catalog.'''
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be a MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS MVP startup routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for state in .0:
state.available)(states.values())):
        raise RuntimeError('macOS startup routes require the complete capability catalog')
    publication = runtime.product_owner.publication
    if publication is None:
        raise RuntimeError('the macOS product is not published')
    frontend_routes = tuple((lambda .0: 