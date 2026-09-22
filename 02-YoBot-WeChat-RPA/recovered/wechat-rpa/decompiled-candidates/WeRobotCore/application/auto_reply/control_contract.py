# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_contract.marshal (Python 3.9)

'''Platform-neutral contracts for the auto-reply control plane.

The mature monitor, configuration and watchdog implementations remain the
owners of their existing behavior.  These small contracts only define the
facts that the first shared Route Pack may consume; they do not import the
Windows entry point, a native Driver or FastAPI.
'''
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Mapping, Optional, Protocol, Sequence, Tuple, runtime_checkable

def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value

AutoReplyAccount = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplySyncReadiness = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyAiReadiness = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyAccountReadiness = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyMonitorSnapshot = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyDesiredState = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyStartOutcome = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyStopOutcome = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyAccountInventory = runtime_checkable(<NODE:12>)
AutoReplyAccountReadinessProvider = runtime_checkable(<NODE:12>)
AutoReplyMonitorController = runtime_checkable(<NODE:12>)
AutoReplyDesiredStateStore = runtime_checkable(<NODE:12>)
AutoReplyRuntimeReporter = runtime_checkable(<NODE:12>)
