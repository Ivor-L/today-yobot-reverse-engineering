# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: workflow.marshal (Python 3.9)

'''Shared startup state and command orchestration without native automation.

The startup shell needs one stable vocabulary for Windows launch/initialization
and future macOS hot attachment/TCC guidance.  Platform backends own process
discovery, native launch, permission prompts, accessibility setup and Driver
initialization.  This module only validates normalized state, protects commands
that can close/reconfigure a client behind explicit confirmation, and prevents
native references from crossing the application boundary.
'''
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Mapping, Optional, Protocol, Tuple, runtime_checkable
from WeRobotCore.application.instances.inventory import freeze_compatibility_value
from WeRobotCore.domain import ErrorCode

def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value.strip()


def _optional_text(value = None, field_name = None):
    if value is None:
        return None
    if not None(value, str):
        raise TypeError('{} must be a string when provided'.format(field_name))
    normalized = value.strip()
    if not normalized:
        pass


class StartupPhase(Enum, str):
    NO_INSTANCE = 'no_instance'
    LOGIN_REQUIRED = 'login_required'
    INITIALIZATION_REQUIRED = 'initialization_required'
    CONFIGURATION_REQUIRED = 'configuration_required'
    READY = 'ready'
    BLOCKED = 'blocked'


class StartupAction(Enum, str):
    LAUNCH = 'launch'
    INITIALIZE = 'initialize'
    CONFIGURE_ACCESSIBILITY = 'configure_accessibility'
    REQUEST_PERMISSION = 'request_permission'


class StartupCompatibilityMode(Enum, str):
    DEFAULT = 'default'
    PLATFORM_FALLBACK = 'platform_fallback'


class StartupInstanceState(Enum, str):
    DISCOVERED = 'discovered'
    LOGIN_REQUIRED = 'login_required'
    READY = 'ready'
    ACTION_REQUIRED = 'action_required'
    FAILED = 'failed'

StartupGuidance = dataclass(True, **('frozen',))(<NODE:12>)
StartupInstanceStatus = dataclass(True, **('frozen',))(<NODE:12>)
StartupActionAvailability = dataclass(True, **('frozen',))(<NODE:12>)
StartupWorkflowSnapshot = dataclass(True, **('frozen',))(<NODE:12>)
StartupCommand = dataclass(True, **('frozen',))(<NODE:12>)
StartupExecutionResult = dataclass(True, **('frozen',))(<NODE:12>)
StartupWorkflowBackend = runtime_checkable(<NODE:12>)

class StartupWorkflowService:
    '''Validate one platform backend and enforce destructive confirmation.'''
    
    def __init__(self = None, backend = None):
        if not isinstance(backend, StartupWorkflowBackend):
            raise TypeError('backend must implement StartupWorkflowBackend')
        self._backend = backend

    
    async def inspect(self = None):
        await self._backend.inspect()
        snapshot = <NODE:28>
        if not isinstance(snapshot, StartupWorkflowSnapshot):
            raise TypeError('startup backend returned an invalid snapshot')
        return snapshot

    
    async def execute(self = None, command = None):
        if not isinstance(command, StartupCommand):
            raise TypeError('command must be a StartupCommand')
        if not command.requires_confirmation and command.confirmed:
            return StartupExecutionResult(command.action, False, ErrorCode.CONFIRMATION_REQUIRED, 'startup command requires explicit user confirmation', **('action', 'success', 'code', 'message'))
        await None._backend.execute(command)
        result = <NODE:28>
        if not isinstance(result, StartupExecutionResult):
            raise TypeError('startup backend returned an invalid execution result')
        if result.action is not command.action:
            raise ValueError('startup result action does not match command')
        return result


