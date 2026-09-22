# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_candidate.marshal (Python 3.9)

'''One coherent, still-default-off macOS Control Host candidate.'''
from dataclasses import dataclass
from typing import Callable, Optional
from fastapi import FastAPI
from WeRobotCore.application.auto_reply import AutoReplyControlService
from WeRobotCore.application.control_access import ControlAccessAuthorizer
from WeRobotCore.bootstrap.macos import MacOSRuntimeBundle
from WeRobotCore.bootstrap.macos_product_startup import MacOSProductStartupPublication
from WeRobotCore.route_packs.instance_inventory import InstanceInventoryRouteBindings
from WeRobotCore.route_packs.agent_runtime_identity import RuntimeIdentityProvider
from control_app import BackendModeProvider, FrontendDirectory, create_control_host_app
from macos import create_macos_instance_inventory_route_bindings
MacOSAutoReplyServiceFactory = Callable[([
    MacOSRuntimeBundle], AutoReplyControlService)]
MacOSControlHostCandidate = dataclass(True, **('frozen',))(<NODE:12>)

def create_macos_control_host_candidate(*, publication, api_key, access_authorizer, auto_reply_service_factory, backend_mode_provider, runtime_identity_provider, frontend_directory, license_service):
    """Build an ASGI candidate without reading secrets or opening a socket.

    ``api_key`` is already-resolved input.  The future signed Control entry is
    responsible for reading it from the product SecretStore before calling
    this function.  The auto-reply factory is intentionally deferred until a
    control request and always receives this publication's runtime bundle.
    """
    if not isinstance(publication, MacOSProductStartupPublication):
        raise TypeError('publication must be MacOSProductStartupPublication')
    if not callable(auto_reply_service_factory):
        raise TypeError('auto_reply_service_factory must be callable')
    if not callable(access_authorizer):
        raise TypeError('access_authorizer must be callable')
    if not callable(backend_mode_provider):
        raise TypeError('backend_mode_provider must be callable')
    if not runtime_identity_provider is not None and callable(runtime_identity_provider):
        raise TypeError('runtime_identity_provider must be callable or None')
    bundle = publication.composition.runtime_bundle
    bindings = create_macos_instance_inventory_route_bindings(bundle)
    
    def provide_auto_reply_service():
        service = auto_reply_service_factory(bundle)
        if not isinstance(service, AutoReplyControlService):
            raise TypeError('auto_reply_service_factory must return AutoReplyControlService')
        return service

    app = None(None, None, None, (lambda : publication.startup_workflow), provide_auto_reply_service, backend_mode_provider, runtime_identity_provider, bindings, frontend_directory, license_service, **('api_key', 'access_authorizer', 'runtime_candidate_provider', 'startup_service_provider', 'auto_reply_service_provider', 'backend_mode_provider', 'runtime_identity_provider', 'instance_inventory_bindings', 'frontend_directory', 'license_service'))
    return MacOSControlHostCandidate(publication, app, bindings, **('publication', 'app', 'instance_inventory_bindings'))

__all__ = [
    'MacOSAutoReplyServiceFactory',
    'MacOSControlHostCandidate',
    'create_macos_control_host_candidate']
