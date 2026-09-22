# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: identity.marshal (Python 3.9)

'''Logical account and instance identities without native window references.'''
from dataclasses import dataclass, field
from enum import Enum
from typing import Mapping, Optional
from capabilities import CapabilityState

class InstanceState(Enum, str):
    DISCOVERED = 'discovered'
    ATTACHED = 'attached'
    READY = 'ready'
    OFFLINE = 'offline'
    ERROR = 'error'

InstanceId = dataclass(True, **('frozen',))(<NODE:12>)
AccountInstance = dataclass(True, **('frozen',))(<NODE:12>)
