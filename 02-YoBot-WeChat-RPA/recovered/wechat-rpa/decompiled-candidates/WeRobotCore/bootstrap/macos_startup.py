# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_startup.marshal (Python 3.9)

'''Explicit, default-off macOS composition for the shared Startup service.'''
from typing import Optional
from WeRobotCore.adapters.wechat.macos_ax import MacOSStartupBackend
from WeRobotCore.application.startup import StartupWorkflowRegistration, StartupWorkflowService
from macos import MacOSRuntimeBundle

def create_macos_startup_workflow(bundle = None):
    '''Compose the shared service without registration or native calls.'''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    platform_services = bundle.runtime.platform_services
    return StartupWorkflowService(MacOSStartupBackend(bundle.inventory, bundle.initialization, platform_services.permissions, platform_services.launcher, **('inventory', 'initialization', 'permissions', 'launcher')))


def register_macos_startup_workflow(*, enabled, registration, bundle):
    '''Publish Mac Startup only after an explicit product-entry decision.'''
    if not isinstance(registration, StartupWorkflowRegistration):
        raise TypeError('registration must be StartupWorkflowRegistration')
    if not isinstance(enabled, bool):
        raise TypeError('enabled must be a boolean')
    if not enabled:
        return registration.register_if_enabled(False)
    if not None(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    return None(None, (lambda : create_macos_startup_workflow(bundle)), **('service_factory',))

