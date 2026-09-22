# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_app.marshal (Python 3.9)

'''Side-effect-free ASGI host for shared YokoWebot control Route Packs.

The factory deliberately receives already-owned providers.  Constructing the
app does not publish a runtime, initialize a platform Driver, inspect secrets,
start a monitor, open a socket, or import either production entry point.  A
future Windows or macOS composition root can therefore mount the same HTTP
contract while keeping platform-native work behind the injected services.
'''
from __future__ import annotations
import hmac
from pathlib import Path
from typing import Any, Callable, Optional, Union
from fastapi import FastAPI, HTTPException, Request, Security, status
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from WeRobotCore.application.auto_reply.control_service import AutoReplyControlService
from WeRobotCore.application.control_access import ControlAccessAuthorizer, ControlAccessDecision
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate
from WeRobotCore.application.startup import StartupWorkflowService
from WeRobotCore.route_packs.auto_reply_control import create_auto_reply_control_router
from WeRobotCore.route_packs.agent_runtime_identity import RuntimeIdentityProvider, create_agent_runtime_identity_router
from WeRobotCore.route_packs.instance_inventory import InstanceInventoryRouteBindings, create_instance_inventory_router
from WeRobotCore.route_packs.runtime_contract import create_runtime_contract_router
from WeRobotCore.route_packs.startup import create_startup_router
RuntimeCandidateProvider = Callable[([], Optional[ProductRuntimeCandidate])]
StartupServiceProvider = Callable[([], Optional[StartupWorkflowService])]
AutoReplyServiceProvider = Callable[([], AutoReplyControlService)]
BackendModeProvider = Callable[([], bool)]
FrontendDirectory = Optional[Union[(str, Path)]]

class _SpaStaticFiles(StaticFiles):
    '''Serve the Vue entry for client routes without masking missing APIs/assets.'''
    
    async def get_response(self = None, path = None, scope = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _is_client_route(path, scope):
        if scope['method'] not in ('GET', 'HEAD'):
            return False
        relative = None.lstrip('/')
        first_segment = relative.split('/', 1)[0]
        if first_segment in frozenset({'api', 'ws', 'docs', 'openapi.json', 'redoc'}):
            return False
        return not (None(relative).suffix)

    _is_client_route = staticmethod(_is_client_route)
    __classcell__ = None


def _require_provider(name = None, provider = None):
    if not callable(provider):
        raise TypeError('{} must be callable'.format(name))


def _frontend_root(directory = None):
    if directory is None:
        return None
    if not None(directory, (str, Path)):
        raise TypeError('frontend_directory must be a path or None')
    root = Path(directory).expanduser().resolve(True, **('strict',))
    if not root.is_dir():
        raise ValueError('frontend_directory must be a directory')
    if not (root / 'index.html').is_file():
        raise ValueError('frontend_directory must contain index.html')
    return root


def create_control_host_app(*, api_key, access_authorizer, runtime_candidate_provider, startup_service_provider, auto_reply_service_provider, backend_mode_provider, runtime_identity_provider, instance_inventory_bindings, frontend_directory, license_service):
    '''Build the shared Control ASGI app without starting or enabling it.

    The API key and access authorizer have no defaults on purpose.  Product
    composition must choose both owners explicitly; this factory never reads
    environment files, Keychain, DPAPI or application configuration.  API-key
    rejection and authorization failure both occur before product providers.
    '''
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be a non-empty string')
    _require_provider('access_authorizer', access_authorizer)
    _require_provider('runtime_candidate_provider', runtime_candidate_provider)
    _require_provider('startup_service_provider', startup_service_provider)
    _require_provider('auto_reply_service_provider', auto_reply_service_provider)
    _require_provider('backend_mode_provider', backend_mode_provider)
    if runtime_identity_provider is not None:
        _require_provider('runtime_identity_provider', runtime_identity_provider)
    if not instance_inventory_bindings is not None and isinstance(instance_inventory_bindings, InstanceInventoryRouteBindings):
        raise TypeError('instance_inventory_bindings must be InstanceInventoryRouteBindings or None')
    frontend_root = _frontend_root(frontend_directory)
    api_key_header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate_transport(request = None, presented_key = None):
        if not presented_key:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, '无效的 API Key', **('status_code', 'detail'))
        return presented_key

    
    async def authenticate(request = None, presented_key = None):
        pass
    # WARNING: Decompyle incomplete

    app = FastAPI('YokoWebot Control API', **('title',))
    if license_service is not None:
        create_license_router = create_license_router
        import WeRobotCore.route_packs.license
        
        async def shutdown_after_unbind():
            await app.state.license_shutdown()

        
        async def business_access(request = None, call_next = None):
            path = request.url.path
            metadata = {
                ('GET', '/api/license/machine-code'),
                ('POST', '/api/license/activate'),
                ('GET', '/api/license/info'),
                ('GET', '/api/license/verify'),
                ('GET', '/api/agent/runtime-identity'),
                ('GET', '/api/agent/contract'),
                ('POST', '/api/license/unbind'),
                ('GET', '/api/runtime/capabilities')}
        # WARNING: Decompyle incomplete

        business_access = None(business_access)
        app.include_router(create_license_router(license_service, authenticate_transport, shutdown_after_unbind, **('service', 'auth_dependency', 'shutdown')))
    metadata_auth = authenticate_transport if license_service is not None else authenticate
    
    async def control_host_health():
        return {
            'status': 'ok',
            'service': 'yokobot',
            'component': 'control-host',
            'schemaVersion': 1 }

    control_host_health = app.get('/api/health', 'control_host_health', **('name',))(control_host_health)
    if runtime_identity_provider is not None:
        app.include_router(create_agent_runtime_identity_router(runtime_identity_provider, metadata_auth, **('identity_provider', 'auth_dependency')))
    app.include_router(create_runtime_contract_router(runtime_candidate_provider, metadata_auth, **('candidate_provider', 'auth_dependency')))
    app.include_router(create_startup_router(startup_service_provider, authenticate, **('service_provider', 'auth_dependency')))
    app.include_router(create_auto_reply_control_router(auto_reply_service_provider, backend_mode_provider, authenticate, **('service_provider', 'backend_mode_provider', 'auth_dependency')))
    if instance_inventory_bindings is not None:
        app.include_router(create_instance_inventory_router(instance_inventory_bindings, authenticate, True, **('bindings', 'auth_dependency', 'protect_agent_status')))
    if frontend_root is not None:
        app.mount('/', _SpaStaticFiles(str(frontend_root), True, **('directory', 'html')), 'unified_frontend', **('name',))
    return app

__all__ = [
    'AutoReplyServiceProvider',
    'BackendModeProvider',
    'FrontendDirectory',
    'RuntimeCandidateProvider',
    'StartupServiceProvider',
    'create_control_host_app']
