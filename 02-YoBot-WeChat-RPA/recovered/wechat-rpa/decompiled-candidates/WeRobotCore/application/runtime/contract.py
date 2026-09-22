# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: contract.marshal (Python 3.9)

'''Platform-neutral projections for the versioned runtime contract.

This module deliberately does not infer product capability from the currently
migrated Driver ports. Windows still owns mature features that have not yet
crossed those ports, while macOS may expose a smaller explicit catalog. A
composition root must therefore provide the product capability snapshot.
'''
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Mapping, Protocol, Tuple, runtime_checkable
from WeRobotCore.domain import CapabilityState
from container import RuntimeDescriptor

def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value

RuntimeCapabilityProvider = runtime_checkable(<NODE:12>)
RuntimeContractSnapshot = dataclass(True, **('frozen',))(<NODE:12>)

class RuntimeContractService:
    '''Build read-only DTOs from an explicit descriptor and capability owner.'''
    
    def __init__(self = None, *, descriptor, capability_provider, app_version, architecture, contract_version, supported_contract_versions):
        if not isinstance(descriptor, RuntimeDescriptor):
            raise TypeError('descriptor must be RuntimeDescriptor')
        if not isinstance(capability_provider, RuntimeCapabilityProvider):
            raise TypeError('capability_provider must implement RuntimeCapabilityProvider')
        self._descriptor = descriptor
        self._capability_provider = capability_provider
        self._app_version = _required_text(app_version, 'app_version')
        self._architecture = _required_text(architecture, 'architecture')
        self._contract_version = _required_text(contract_version, 'contract_version')
        if not isinstance(supported_contract_versions, tuple):
            raise TypeError('supported_contract_versions must be a tuple')
        self._supported_contract_versions = supported_contract_versions

    
    def snapshot(self = None):
        capabilities = self._capability_provider.snapshot_capabilities()
        if not isinstance(capabilities, Mapping):
            raise TypeError('capability provider must return a mapping')
        return RuntimeContractSnapshot(self._app_version, self._contract_version, self._supported_contract_versions, self._descriptor.platform, self._architecture, self._descriptor.driver_id, self._descriptor.driver_api_version, capabilities, **('app_version', 'contract_version', 'supported_contract_versions', 'platform', 'architecture', 'driver_id', 'driver_api_version', 'capabilities'))


