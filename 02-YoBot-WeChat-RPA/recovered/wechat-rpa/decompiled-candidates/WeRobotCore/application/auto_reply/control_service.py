# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_service.marshal (Python 3.9)

'''Shared orchestration for the auto-reply monitor control plane.

The service owns product ordering and all-or-nothing account readiness.  It
does not discover UI elements, read configuration files, import FastAPI or
know whether the injected account/monitor adapters use Windows UIA or macOS
AX.
'''
from typing import Any, Mapping, Optional, Sequence, Tuple
from WeRobotCore.ports import PermissionService
from WeRobotCore.ports.platform import PermissionStatus
from control_contract import AutoReplyAccount, AutoReplyAccountInventory, AutoReplyAccountReadiness, AutoReplyAccountReadinessProvider, AutoReplyDesiredState, AutoReplyDesiredStateStore, AutoReplyMonitorController, AutoReplyMonitorSnapshot, AutoReplyRuntimeReporter, AutoReplyStartOutcome, AutoReplyStopOutcome

class AutoReplyControlService:
    '''Coordinate start, stop and status without owning a Driver.'''
    
    def __init__(self, account_inventory, readiness_provider, monitor = None, desired_state = None, reporter = None, start_permissions = (None, ()), required_start_permissions = {
        'account_inventory': AutoReplyAccountInventory,
        'readiness_provider': AutoReplyAccountReadinessProvider,
        'monitor': AutoReplyMonitorController,
        'desired_state': AutoReplyDesiredStateStore,
        'reporter': AutoReplyRuntimeReporter,
        'start_permissions': Optional[PermissionService],
        'required_start_permissions': Sequence[str],
        'return': None }):
        dependencies = (('account_inventory', account_inventory, AutoReplyAccountInventory), ('readiness_provider', readiness_provider, AutoReplyAccountReadinessProvider), ('monitor', monitor, AutoReplyMonitorController), ('desired_state', desired_state, AutoReplyDesiredStateStore), ('reporter', reporter, AutoReplyRuntimeReporter))
        for name, dependency, protocol in dependencies:
            if not isinstance(dependency, protocol):
                raise TypeError('{} must implement {}'.format(name, protocol.__name__))
        self._account_inventory = account_inventory
        self._readiness_provider = readiness_provider
        self._monitor = monitor
        self._desired_state = desired_state
        self._reporter = reporter
        if not start_permissions is not None and isinstance(start_permissions, PermissionService):
            raise TypeError('start_permissions must implement PermissionService')
        normalized_permissions = tuple(required_start_permissions)
        if any((lambda .0: for name in .0:
if not not isinstance(name, str):
passnot name.strip())(normalized_permissions)):
            raise ValueError('required_start_permissions must contain names')
        if len(set(normalized_permissions)) != len(normalized_permissions):
            raise ValueError('required_start_permissions cannot contain duplicates')
        if (start_permissions is not None) != bool(normalized_permissions):
            raise ValueError('start_permissions and required_start_permissions must be configured together')
        self._start_permissions = start_permissions
        self._required_start_permissions = normalized_permissions

    
    async def start(self = None, reply_mode = None, is_backend_mode = None, source = ('local', False, 'api')):
        '''Start all valid accounts or none, preserving the Legacy ordering.'''
        if not isinstance(is_backend_mode, bool):
            raise TypeError('is_backend_mode must be a boolean')
        if not isinstance(source, str) or source.strip():
            raise ValueError('source must be a non-empty string')
        resolved_reply_mode = 'local' if not reply_mode == 'agent' and is_backend_mode else reply_mode
    # WARNING: Decompyle incomplete

    
    async def _request_missing_start_permissions(self = None):
        if self._start_permissions is None:
            return ()
        await None._start_permissions.check(self._required_start_permissions)
        states = <NODE:28>
        by_name = (lambda .0: pass# WARNING: Decompyle incomplete
)(states)
        missing = None((lambda .0 = None: 