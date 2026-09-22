# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_realtime.marshal (Python 3.9)

'''Realtime adapter for the shared Vue application and Agent plugin.

The mature monitor and task system already publish UI events through their
existing ``WebSocketManager``. The macOS Host binds that owner to the
established ``/ws`` transport and exposes the existing manual-review toggle.
'''
from __future__ import annotations
import asyncio
import hmac
import os
import time
import uuid
from typing import Any, Mapping, Optional, Protocol
from fastapi import APIRouter, HTTPException, Security, WebSocket
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, StrictBool
from starlette.websockets import WebSocketDisconnect
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
MACOS_MVP_WEBSOCKET_PATH = '/ws'
MACOS_MVP_MANUAL_REVIEW_PATH = '/api/chat/monitor/manual-review'
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_realtime_installed'

class MacOSMvpManualReviewRequest(BaseModel):
    enabled: 'StrictBool' = ConfigDict('forbid', **('extra',))


class MacOSMvpWebSocketManager(Protocol):
    
    async def connect(self = None, websocket = None):
        pass

    
    def disconnect(self = None, websocket = None):
        pass

    
    def register_agent_connection(self = None, websocket = None, client_id = None, subscribe = {
        'websocket': 'WebSocket',
        'client_id': 'str',
        'subscribe': 'list[str]',
        'return': 'Any' }):
        pass

    
    def enable_agent_push(self = None):
        pass

    
    def bind_agent_push_event_loop(self = None):
        pass



class MacOSMvpManualReviewMonitor(Protocol):
    
    def set_manual_review_enabled(self = None, enabled = None):
        pass



def create_macos_mvp_realtime_router(*, websocket_manager, monitor, api_key, receive_timeout_seconds, allow_agent_registration, server_version):
    '''Bind realtime transport to the existing shared owners.

    Standalone Control remains UI-only. Agent-managed plugin mode additionally
    enables the same registration receipt used by the Windows service.
    '''
    if not callable(getattr(websocket_manager, 'connect', None)) or callable(getattr(websocket_manager, 'disconnect', None)):
        raise TypeError('websocket_manager does not implement the UI contract')
    if not callable(getattr(monitor, 'set_manual_review_enabled', None)):
        raise TypeError('monitor does not implement manual review control')
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be a non-empty string')
    if isinstance(receive_timeout_seconds, (int, float)) or isinstance(receive_timeout_seconds, bool):
        raise TypeError('receive_timeout_seconds must be numeric')
    if not float(receive_timeout_seconds) <= float(receive_timeout_seconds) or float(receive_timeout_seconds) <= 120:
        pass
    else:
        1
    raise ValueError('receive_timeout_seconds must be between 1 and 120')
    if not isinstance(allow_agent_registration, bool):
        raise TypeError('allow_agent_registration must be a boolean')
    if not allow_agent_registration and callable(getattr(websocket_manager, 'register_agent_connection', None)):
        raise TypeError('websocket_manager does not implement Agent registration')
    reported_server_version = os.environ.get('APP_VERSION', 'unknown') if server_version is None else server_version
    if not isinstance(reported_server_version, str):
        raise TypeError('server_version must be a string or None')
    api_key_header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented_key = None):
        if not presented_key:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(403, 'invalid API key', **('status_code', 'detail'))
        return str(presented_key)

    router = APIRouter()
    
    async def macos_mvp_ui_websocket(websocket = None):
        await websocket_manager.connect(websocket)
    # WARNING: Decompyle incomplete

    macos_mvp_ui_websocket = None(macos_mvp_ui_websocket)
    
    async def set_macos_mvp_manual_review(request = None, _api_key = None):
        pass
    # WARNING: Decompyle incomplete

    set_macos_mvp_manual_review = None(set_macos_mvp_manual_review)
    return router


def install_macos_mvp_realtime_routes(runtime = None):
    '''Install standalone UI realtime routes before the SPA catch-all.'''
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be a MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS MVP realtime routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for state in .0:
state.available)(states.values())):
        raise RuntimeError('macOS realtime routes require the complete capability catalog')
    websocket_manager = websocket_manager
    import WeRobotCore.task_system_v2.websocket_manager
    if inputs.backend_mode:
        websocket_manager.enable_agent_push()
        
        async def bind_agent_push_event_loop():
            websocket_manager.bind_agent_push_event_loop()

        app.add_event_handler('startup', bind_agent_push_event_loop)
    frontend_routes = tuple((lambda .0: 