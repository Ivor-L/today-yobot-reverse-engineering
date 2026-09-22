# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: services.marshal (Python 3.9)

'''Platform service ports kept separate from WeChat business behavior.'''
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional, Protocol, Sequence, runtime_checkable
from WeRobotCore.domain import OperationResult

class PermissionStatus(Enum, str):
    GRANTED = 'granted'
    DENIED = 'denied'
    NOT_DETERMINED = 'not_determined'
    UNAVAILABLE = 'unavailable'

PermissionState = dataclass(True, **('frozen',))(<NODE:12>)
AppPaths = runtime_checkable(<NODE:12>)
SecretStore = runtime_checkable(<NODE:12>)
PermissionService = runtime_checkable(<NODE:12>)
ProcessManager = runtime_checkable(<NODE:12>)
ApplicationLauncher = runtime_checkable(<NODE:12>)
