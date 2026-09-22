# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: inventory.marshal (Python 3.9)

'''Immutable instance inventory facts with an isolated compatibility sidecar.

The shared application layer must never learn how a native WeChat instance is
identified.  During the Windows migration, however, unchanged Legacy routes
still need their established dictionary fields.  Each item therefore carries
one normalized :class:`AccountInstance` and one deeply read-only compatibility
snapshot.  Only an adapter may create or project the compatibility sidecar.
'''
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Mapping, Protocol, Tuple, runtime_checkable
from WeRobotCore.domain import AccountInstance, CapabilityState

def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value.strip()


def freeze_compatibility_value(value = None):
    '''Copy mutable containers into a process-local read-only representation.'''
    if isinstance(value, Mapping):
        return MappingProxyType((lambda .0: pass# WARNING: Decompyle incomplete
)(value.items()))
    if None(value, (list, tuple)):
        return tuple((lambda .0: for item in .0:
freeze_compatibility_value(item))(value))
    if None(value, (set, frozenset)):
        return frozenset((lambda .0: for item in .0:
freeze_compatibility_value(item))(value))


def thaw_compatibility_value(value = None):
    '''Return a detached JSON-style copy for a Legacy compatibility response.'''
    if isinstance(value, Mapping):
        return (lambda .0: pass# WARNING: Decompyle incomplete
)(value.items())
    if None(value, (tuple, list)):
        return (lambda .0: [ thaw_compatibility_value(item) for item in .0 ])(value)
    if None(value, (set, frozenset)):
        return (lambda .0: [ thaw_compatibility_value(item) for item in .0 ])(value)

InstanceInventoryItem = dataclass(True, **('frozen',))(<NODE:12>)
InstanceInventorySnapshot = dataclass(True, **('frozen',))(<NODE:12>)
InstanceInventorySource = runtime_checkable(<NODE:12>)
