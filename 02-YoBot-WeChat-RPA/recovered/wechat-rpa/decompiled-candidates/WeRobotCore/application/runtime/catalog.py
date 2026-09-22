# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: catalog.marshal (Python 3.9)

'''Explicit build-level capability declarations for runtime discovery.

The catalog answers what a packaged YokoWebot runtime deliberately exposes to
the shared UI and Agent contract.  It is not an execution authorization gate:
account-scoped operations must still check ``AccountInstance.capabilities``
immediately before calling a Driver.

No capability is inferred from implemented Protocol methods, migrated Driver
ports, the operating-system name, or a sibling platform catalog.  A platform
composition root must declare every state it wants to publish.
'''
from types import MappingProxyType
from typing import Dict, Iterable, Mapping, Tuple
from WeRobotCore.domain import CapabilityName, CapabilityState, CapabilityStatus
_KNOWN_CAPABILITY_NAMES = frozenset((lambda .0: for item in .0:
item.value)(CapabilityName))

class RuntimeCapabilityCatalog:
    '''Immutable, explicit provider for build-level capability discovery.'''
    __slots__ = ('_capabilities',)
    
    def __init__(self = None, declarations = None):
        if isinstance(declarations, Mapping) or isinstance(declarations, (str, bytes)):
            raise TypeError('declarations must be an iterable of CapabilityState')
    # WARNING: Decompyle incomplete

    
    def _validate_state(state = None):
        if state.reason_code is not None:
            if not isinstance(state.reason_code, str) or state.reason_code.strip():
                raise ValueError('reason_code must be a non-empty string when provided')
        if not state.status is not CapabilityStatus.SUPPORTED and state.reason_code:
            raise ValueError('non-supported capability states require a reason_code: {}'.format(state.name))
        if not state.status is CapabilityStatus.PERMISSION_REQUIRED and state.required_permissions:
            raise ValueError('permission_required capabilities require permissions: {}'.format(state.name))
        if len(set(state.required_permissions)) != len(state.required_permissions):
            raise ValueError('required_permissions cannot contain duplicates: {}'.format(state.name))

    _validate_state = None(_validate_state)
    
    def declared_names(self = None):
        return tuple(self._capabilities)

    declared_names = None(declared_names)
    
    def snapshot_capabilities(self = None):
        '''Return a fresh map without filling undeclared known capabilities.'''
        return dict(self._capabilities)


