# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: fake.marshal (Python 3.9)

'''In-memory platform services used by tests and contract development.'''
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, Optional, Sequence, Set
from WeRobotCore.domain import ErrorCode, OperationResult
from WeRobotCore.ports.platform import PermissionState, PermissionStatus
FakeAppPaths = dataclass(True, **('frozen',))(<NODE:12>)
InMemorySecretStore = dataclass(<NODE:12>)

class StaticPermissionService:
    
    def __init__(self = None, granted = None):
        self._granted = set(granted)

    
    async def check(self = None, names = None):
        return None((lambda .0 = None: for name in .0:
PermissionState(name, PermissionStatus.GRANTED if name in self._granted else PermissionStatus.NOT_DETERMINED, **('name', 'status')))(names))

    
    async def request(self = None, name = None):
        self._granted.add(name)
        return PermissionState(name, PermissionStatus.GRANTED, **('name', 'status'))



class FakeProcessManager:
    
    def __init__(self = None, running_process_ids = None):
        self.running_process_ids = set(running_process_ids)
        self.frontmost_process_id = None

    
    async def is_running(self = None, process_id = None):
        return process_id in self.running_process_ids

    
    async def bring_to_front(self = None, process_id = None):
        if process_id not in self.running_process_ids:
            return OperationResult.failed(ErrorCode.INSTANCE_NOT_FOUND, 'process is not running')
        self.frontmost_process_id = None
        return OperationResult.succeeded('process is frontmost', True, **('verified',))



class FakeApplicationLauncher:
    
    def __init__(self = None):
        self.launched_application_ids = []

    
    async def launch(self = None, application_id = None):
        if not application_id:
            return OperationResult.failed(ErrorCode.INVALID_ARGUMENT, 'application_id must be non-empty')
        None.launched_application_ids.append(application_id)
        return OperationResult.succeeded('application launched', True, **('verified',))


