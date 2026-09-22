# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: commands.marshal (Python 3.9)

'''Platform-neutral orchestration for instance exit and switch commands.

Platform backends own native validation, active-instance mutation, account
initialization/binding and process-global automation facades.  This module
owns only the shared ordering around monitor cleanup and contact statistics.
It has no FastAPI, storage, scheduler or native automation dependencies.
'''
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Protocol, runtime_checkable
from WeRobotCore.domain import ErrorCode, InstanceId

def _optional_text(value = None, field_name = None):
    if value is None:
        return None
    if not None(value, str):
        raise TypeError('{} must be a string when provided'.format(field_name))
    normalized = value.strip()
    if not normalized:
        pass


def _validate_result_code(success = None, code = None):
    if not isinstance(success, bool):
        raise TypeError('success must be a bool')
    if not isinstance(code, ErrorCode):
        raise TypeError('code must be an ErrorCode')
    if success and code is not ErrorCode.OK:
        raise ValueError('successful command results must use ErrorCode.OK')
    if success and code is ErrorCode.OK:
        raise ValueError('failed command results cannot use ErrorCode.OK')

InstanceExitResult = dataclass(True, **('frozen',))(<NODE:12>)
InstanceSwitchResult = dataclass(True, **('frozen',))(<NODE:12>)
InstanceContactCounts = dataclass(True, **('frozen',))(<NODE:12>)

class InstanceMonitorStopStatus(Enum, str):
    NOT_RUNNING = 'not_running'
    STOPPED = 'stopped'
    FAILED = 'failed'

InstanceMonitorStopResult = dataclass(True, **('frozen',))(<NODE:12>)
InstanceExitOutcome = dataclass(True, **('frozen',))(<NODE:12>)
InstanceSwitchOutcome = dataclass(True, **('frozen',))(<NODE:12>)
InstanceExitBackend = runtime_checkable(<NODE:12>)
InstanceSwitchBackend = runtime_checkable(<NODE:12>)
InstanceMonitorStopper = runtime_checkable(<NODE:12>)
InstanceContactStatsProvider = runtime_checkable(<NODE:12>)

class InstanceCommandService:
    '''Apply shared command ordering without knowing a native Driver.'''
    
    def __init__(self = None, *, exit_backend, switch_backend, monitor, contact_stats):
        dependencies = (('exit_backend', exit_backend, InstanceExitBackend), ('switch_backend', switch_backend, InstanceSwitchBackend), ('monitor', monitor, InstanceMonitorStopper), ('contact_stats', contact_stats, InstanceContactStatsProvider))
        for name, dependency, protocol in dependencies:
            if not isinstance(dependency, protocol):
                raise TypeError('{} must implement {}'.format(name, protocol.__name__))
        self._exit_backend = exit_backend
        self._switch_backend = switch_backend
        self._monitor = monitor
        self._contact_stats = contact_stats

    
    async def exit(self = None, instance_id = None):
        self._require_instance_id(instance_id)
        await self._exit_backend.exit(instance_id)
        result = <NODE:28>
        self._validate_result_identity(instance_id, result, InstanceExitResult)
        monitor_result = None
    # WARNING: Decompyle incomplete

    
    async def switch(self = None, instance_id = None):
        self._require_instance_id(instance_id)
        await self._switch_backend.switch(instance_id)
        result = <NODE:28>
        self._validate_result_identity(instance_id, result, InstanceSwitchResult)
        counts = None
        if result.success:
            if not result.account_id:
                pass
            await self._contact_stats.counts('')
            counts = <NODE:28>
            if not isinstance(counts, InstanceContactCounts):
                raise TypeError('contact stats returned an invalid InstanceContactCounts')
        return InstanceSwitchOutcome(result, counts, **('result', 'counts'))

    
    def _require_instance_id(instance_id = None):
        if not isinstance(instance_id, InstanceId):
            raise TypeError('instance_id must be an InstanceId')

    _require_instance_id = None(_require_instance_id)
    
    def _validate_result_identity(instance_id = None, result = None, result_type = staticmethod):
        if not isinstance(result, result_type):
            raise TypeError('command backend returned an invalid {}'.format(result_type.__name__))
        if result.instance_id != instance_id:
            raise ValueError('command result instance_id does not match request')

    _validate_result_identity = None(_validate_result_identity)

