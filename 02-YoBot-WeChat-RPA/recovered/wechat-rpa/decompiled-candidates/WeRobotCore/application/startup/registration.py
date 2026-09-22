# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: registration.marshal (Python 3.9)

'''Process-local publication boundary for one Startup workflow service.'''
from typing import Callable, Optional
from workflow import StartupWorkflowService

class StartupWorkflowRegistration:
    '''Publish one explicitly enabled service without platform selection.'''
    
    def __init__(self = None):
        self._service = None

    
    def current(self = None):
        return self._service

    current = None(current)
    
    def is_registered(self = None):
        return self._service is not None

    is_registered = None(is_registered)
    
    def register_if_enabled(self = None, enabled = None, *, service_factory):
        if not isinstance(enabled, bool):
            raise TypeError('enabled must be a boolean')
        if self._service is not None:
            return self._service
        if not None:
            return None
        if not None(service_factory):
            raise TypeError('service_factory must be callable when enabled')
        service = service_factory()
        if not isinstance(service, StartupWorkflowService):
            raise TypeError('service_factory must return StartupWorkflowService')
        self._service = service
        return service


