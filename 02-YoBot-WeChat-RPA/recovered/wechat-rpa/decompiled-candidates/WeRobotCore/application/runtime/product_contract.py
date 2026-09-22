# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: product_contract.marshal (Python 3.9)

'''One process-level owner for runtime contract discovery and resolution.'''
from typing import Tuple
from catalog import RuntimeCapabilityCatalog
from container import RuntimeDescriptor
from contract import RuntimeContractService
from resolution import RuntimeCapabilityResolver

class RuntimeProductContract:
    '''Bind one descriptor and explicit catalog to shared contract services.

    Construction is side-effect free: it does not snapshot capabilities,
    inspect permissions, attach accounts, import an entry point, or call a
    Driver. Request handlers may later use ``contract_service`` for build
    discovery and ``capability_resolver`` with request-scoped account facts.
    '''
    __slots__ = ('_descriptor', '_capability_catalog', '_contract_service', '_capability_resolver')
    
    def __init__(self = None, *, descriptor, capability_catalog, app_version, architecture, contract_version, supported_contract_versions):
        if not isinstance(descriptor, RuntimeDescriptor):
            raise TypeError('descriptor must be RuntimeDescriptor')
        if not isinstance(capability_catalog, RuntimeCapabilityCatalog):
            raise TypeError('capability_catalog must be an explicit RuntimeCapabilityCatalog')
        self._descriptor = descriptor
        self._capability_catalog = capability_catalog
        self._contract_service = RuntimeContractService(descriptor, capability_catalog, app_version, architecture, contract_version, supported_contract_versions, **('descriptor', 'capability_provider', 'app_version', 'architecture', 'contract_version', 'supported_contract_versions'))
        self._capability_resolver = RuntimeCapabilityResolver(capability_catalog)

    
    def descriptor(self = None):
        return self._descriptor

    descriptor = None(descriptor)
    
    def capability_catalog(self = None):
        return self._capability_catalog

    capability_catalog = None(capability_catalog)
    
    def contract_service(self = None):
        return self._contract_service

    contract_service = None(contract_service)
    
    def capability_resolver(self = None):
        return self._capability_resolver

    capability_resolver = None(capability_resolver)

