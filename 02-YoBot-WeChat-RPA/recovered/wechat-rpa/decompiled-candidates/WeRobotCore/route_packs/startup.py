# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: startup.marshal (Python 3.9)

'''Authenticated additive routes for one published Startup workflow.

The Route Pack has no platform selection or native automation imports.  A
composition root explicitly publishes a service and supplies the existing API
key dependency.  Legacy startup endpoints remain separate during migration.
'''
from __future__ import annotations
from typing import Any, Callable, Dict, Mapping, Optional, Set
from fastapi import APIRouter, HTTPException, Security, status
from pydantic import BaseModel, Field, StrictBool
from WeRobotCore.application.startup import StartupAction, StartupCommand, StartupCompatibilityMode, StartupWorkflowService
STARTUP_RUNTIME_NOT_REGISTERED = 'STARTUP_RUNTIME_NOT_REGISTERED'
STARTUP_WORKFLOW_UNAVAILABLE = 'STARTUP_WORKFLOW_UNAVAILABLE'
STARTUP_COMMAND_INVALID = 'STARTUP_COMMAND_INVALID'
ServiceProvider = Callable[([], Optional[StartupWorkflowService])]

class StartupCommandRequest(BaseModel):
    action: 'StartupAction' = 'StartupCommandRequest'
    confirmed: 'StrictBool' = False
    parameters: 'Dict[str, Any]' = Field(dict, **('default_factory',))
    
    class Config:
        extra = 'forbid'



def _error_detail(code = None, message = None):
    return {
        'code': code,
        'message': message }


def _service(service_provider = None):
    pass
# WARNING: Decompyle incomplete


def _reject_extra_parameters(parameters = None, allowed = None):
    extras = set(parameters) - allowed
    if extras:
        raise ValueError('unsupported parameters: {}'.format(', '.join(sorted((lambda .0: for item in .0:
str(item))(extras)))))


def _strict_int(value = None, field_name = None):
    if isinstance(value, int) or isinstance(value, bool):
        raise TypeError('{} must be an integer'.format(field_name))
    return value


def _strict_bool(value = None, field_name = None):
    if not isinstance(value, bool):
        raise TypeError('{} must be a boolean'.format(field_name))
    return value


def _command(request = None):
    parameters = request.parameters
    if request.action is StartupAction.LAUNCH:
        _reject_extra_parameters(parameters, {
            'count',
            'closeExisting'})
        return StartupCommand(request.action, _strict_int(parameters.get('count', 1), 'count'), _strict_bool(parameters.get('closeExisting', False), 'closeExisting'), request.confirmed, **('action', 'launch_count', 'close_existing', 'confirmed'))
    if None.action is StartupAction.INITIALIZE:
        _reject_extra_parameters(parameters, set())
        return StartupCommand(request.action, request.confirmed, **('action', 'confirmed'))
    if None.action is StartupAction.CONFIGURE_ACCESSIBILITY:
        _reject_extra_parameters(parameters, {
            'compatibilityMode'})
        raw_mode = parameters.get('compatibilityMode', StartupCompatibilityMode.DEFAULT.value)
        if not isinstance(raw_mode, str):
            raise TypeError('compatibilityMode must be a string')
        return StartupCommand(request.action, StartupCompatibilityMode(raw_mode), request.confirmed, **('action', 'compatibility_mode', 'confirmed'))
    None(parameters, {
        'permissionName'})
    permission_name = parameters.get('permissionName')
    if not permission_name is not None and isinstance(permission_name, str):
        raise TypeError('permissionName must be a string')
    return StartupCommand(request.action, permission_name, request.confirmed, **('action', 'permission_name', 'confirmed'))


def create_startup_router(*, service_provider, auth_dependency):
    '''Create version-1 Startup routes without registering a backend.'''
    if not callable(service_provider):
        raise TypeError('service_provider must be callable')
    if not callable(auth_dependency):
        raise TypeError('auth_dependency must be callable')
    router = APIRouter()
    
    async def get_runtime_startup(_api_key = None):
        service = _service(service_provider)
    # WARNING: Decompyle incomplete

    get_runtime_startup = None(get_runtime_startup)
    
    async def execute_runtime_startup_action(request = None, _api_key = None):
        pass
    # WARNING: Decompyle incomplete

    execute_runtime_startup_action = None(execute_runtime_startup_action)
    return router

__all__ = [
    'STARTUP_COMMAND_INVALID',
    'STARTUP_RUNTIME_NOT_REGISTERED',
    'STARTUP_WORKFLOW_UNAVAILABLE',
    'StartupCommandRequest',
    'create_startup_router']
