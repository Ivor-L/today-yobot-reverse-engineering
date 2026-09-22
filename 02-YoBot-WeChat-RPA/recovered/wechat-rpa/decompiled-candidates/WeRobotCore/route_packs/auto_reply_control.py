# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_reply_control.marshal (Python 3.9)

'''Legacy-compatible HTTP routes for the shared auto-reply control service.

The Route Pack owns only request parsing, authentication wiring and the
existing Legacy v1 response projection. Account discovery, configuration
validation, monitor lifecycle, desired state and diagnostics remain owned by
``AutoReplyControlService`` and its injected adapters.

This module deliberately has no dependency on ``api_server.py`` or a native
automation backend so the same routes can be mounted by the Windows legacy
entry point and a future macOS Control Host.
'''
from __future__ import annotations
import logging
from typing import Any, Callable
from fastapi import APIRouter, HTTPException, Request, Security
from WeRobotCore.application.auto_reply.control_service import AutoReplyControlService
ControlServiceProvider = Callable[([], AutoReplyControlService)]
BackendModeProvider = Callable[([], bool)]
_logger = logging.getLogger(__name__)

def _service(service_provider = None):
    service = service_provider()
    if not isinstance(service, AutoReplyControlService):
        raise TypeError('service_provider must return AutoReplyControlService')
    return service


def create_auto_reply_control_router(*, service_provider, backend_mode_provider, auth_dependency):
    '''Create the three frozen Legacy v1 auto-reply control routes.'''
    if not callable(service_provider):
        raise TypeError('service_provider must be callable')
    if not callable(backend_mode_provider):
        raise TypeError('backend_mode_provider must be callable')
    if not callable(auth_dependency):
        raise TypeError('auth_dependency must be callable')
    router = APIRouter()
    
    async def get_monitor_status(_api_key = None):
        '''Return the mature UI-facing monitor status projection.'''
        pass
    # WARNING: Decompyle incomplete

    get_monitor_status = None(get_monitor_status)
    
    async def stop_chat_monitor(_api_key = None):
        '''Stop all monitored accounts through the shared control service.'''
        pass
    # WARNING: Decompyle incomplete

    stop_chat_monitor = None(stop_chat_monitor)
    
    async def start_multi_chat_monitor(request = None, _api_key = None):
        '''Start the mature all-account monitor with an optional reply mode.'''
        pass
    # WARNING: Decompyle incomplete

    start_multi_chat_monitor = None(start_multi_chat_monitor)
    return router

__all__ = [
    'BackendModeProvider',
    'ControlServiceProvider',
    'create_auto_reply_control_router']
