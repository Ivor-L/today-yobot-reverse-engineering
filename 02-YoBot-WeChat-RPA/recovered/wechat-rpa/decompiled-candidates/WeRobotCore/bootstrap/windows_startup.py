# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_startup.marshal (Python 3.9)

'''Explicit Windows composition for the shared Startup workflow.'''
from typing import Optional
from WeRobotCore.adapters.wechat.windows_legacy import WindowsLegacyStartupBackend, WindowsLegacyStartupOperations
from WeRobotCore.application.instances import InstanceInventorySource
from WeRobotCore.application.startup import StartupWorkflowRegistration, StartupWorkflowService

def register_windows_startup_workflow(*, enabled, registration, inventory, operations):
    '''Publish Windows Startup only when an entry point opts in explicitly.'''
    if not isinstance(registration, StartupWorkflowRegistration):
        raise TypeError('registration must be StartupWorkflowRegistration')
    if not isinstance(enabled, bool):
        raise TypeError('enabled must be a boolean')
    if not enabled:
        return registration.register_if_enabled(False)
    if not None(inventory, InstanceInventorySource):
        raise TypeError('inventory must implement InstanceInventorySource')
    if not isinstance(operations, WindowsLegacyStartupOperations):
        raise TypeError('operations must implement WindowsLegacyStartupOperations')
    return None(None, (lambda : StartupWorkflowService(WindowsLegacyStartupBackend(inventory, operations, **('inventory', 'operations')))), **('service_factory',))

