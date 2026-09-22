# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime_source.marshal (Python 3.9)

'''Platform-neutral runtime facts consumed by the mature chat monitor.

The monitor owns polling, comparison, baselining and task creation.  A
platform adapter only supplies which initialized accounts are ready, whether
one account is still online, and whether the platform owns a separate
visibility gate before a session-list read.
'''
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Protocol, Sequence, runtime_checkable

def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value.strip()

MonitorAccount = dataclass(True, **('frozen',))(<NODE:12>)

class MonitorAccountState(Enum, str):
    ONLINE = 'online'
    UNKNOWN = 'unknown'
    OFFLINE = 'offline'
    INSTANCE_LOST = 'instance_lost'

MonitorAccountStatus = dataclass(True, **('frozen',))(<NODE:12>)

class MonitorPollVisibilityState(Enum, str):
    VISIBLE = 'visible'
    FULLY_OCCLUDED = 'fully_occluded'
    UNKNOWN = 'unknown'
    NOT_APPLICABLE = 'not_applicable'

MonitorPollVisibility = dataclass(True, **('frozen',))(<NODE:12>)
MonitorRuntimeSource = runtime_checkable(<NODE:12>)
