# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: startup.marshal (Python 3.9)

'''macOS projection for the shared Startup workflow contract.'''
from typing import Dict, Optional, Protocol, Sequence, Tuple, runtime_checkable
from WeRobotCore.application.instances import InstanceInitializationBatch, InstanceInitializationBackend, InstanceInventorySnapshot, InstanceInventorySource
from WeRobotCore.application.startup import StartupAction, StartupActionAvailability, StartupCommand, StartupExecutionResult, StartupGuidance, StartupInstanceState, StartupInstanceStatus, StartupPhase, StartupWorkflowSnapshot
from WeRobotCore.domain import ErrorCode, InstanceState
from WeRobotCore.ports import ApplicationLauncher, PermissionService
from WeRobotCore.ports.platform import PermissionState, PermissionStatus
from driver import MACOS_AX_DRIVER_ID
MACOS_STARTUP_WECHAT_APPLICATION_ID = 'com.tencent.xinWeChat'
MACOS_STARTUP_REQUIRED_PERMISSIONS = ('accessibility', 'screen_recording')
MacOSStartupInitialization = runtime_checkable(<NODE:12>)

def _permission_guidance(states = None):
    missing = tuple((lambda .0: 