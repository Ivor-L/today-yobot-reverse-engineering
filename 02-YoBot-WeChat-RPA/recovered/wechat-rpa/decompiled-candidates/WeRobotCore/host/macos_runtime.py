# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_runtime.marshal (Python 3.9)

'''Final no-server preparation gate for the macOS Control runtime.

This module joins explicit launch inputs, startup-only Keychain preloading,
the shared authorization policy and one already-gated product publication.
It deliberately stops at a ``MacOSControlHostLaunchPlan``: no function in this
module opens a socket or reads process-global argv/environment/home values.
'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from datetime import datetime, timezone
import time
from typing import Callable, Optional
from WeRobotCore.adapters.control import ExplicitYokoRuntimeLeaseClient, RequestsYokoRuntimeLeaseTransport, YokoRuntimeLeaseTransport, discover_macos_auto_reply_secret_keys
from WeRobotCore.adapters.platform.macos_native import MacOSAppPaths
from WeRobotCore.application.auto_reply import PreloadedAutoReplySecretSnapshot, preload_auto_reply_secrets
from WeRobotCore.application.control_access import ControlAccessAuthorizer, ControlLegacyLicenseVerifier, LegacyCompatibleControlAccessAuthorizer
from WeRobotCore.adapters.control.access import ExplicitYokoSeatVerifier, RequestsYokoSeatVerificationTransport
from WeRobotCore.adapters.control.license import LegacyLicenseTransport
from WeRobotCore.application.control_license import ControlLicenseService
from WeRobotCore.application.control_runtime_lease import ControlRuntimeLeaseOwner, RuntimeLeaseSleeper
from WeRobotCore.bootstrap.macos_product_startup import MacOSProductStartupPublication
from WeRobotCore.ports import SecretStore
from control_app import FrontendDirectory
from macos_candidate import MacOSAutoReplyServiceFactory
from macos_launch import MacOSControlHostLaunchPlan, MacOSControlLaunchInputs, prepare_macos_control_host_launch
MacOSProductPublicationFactory = Callable[([
    Callable[([
        str], Optional[str])]], MacOSProductStartupPublication)]
MacOSAutoReplyServiceFactoryBuilder = Callable[([
    Callable[([
        str], Optional[str])]], MacOSAutoReplyServiceFactory)]

def _utc_now():
    return datetime.now(timezone.utc)

MacOSControlRuntimePreparation = dataclass(True, **('frozen',))(<NODE:12>)

def _publication_paths(publication = None):
    paths = publication.composition.runtime_bundle.runtime.platform_services.paths
    if not isinstance(paths, MacOSAppPaths):
        raise TypeError('macOS publication must expose MacOSAppPaths')
    return paths


async def prepare_macos_control_runtime(*, inputs, secret_store, publication_factory, auto_reply_service_factory_builder, legacy_license_verifier, seat_transport, license_transport, runtime_lease_transport, machine_code_provider, frontend_directory, clock, wall_clock, sleeper):
    '''Prepare one runtime after required secrets load, without serving it.

    ``publication_factory`` and the AutoReply service builder receive the same
    synchronous resolver backed by one process-scoped snapshot.  Authenticated
    configuration routes may atomically refresh that same object; AutoReply
    requests never access Keychain and the product graph cannot accidentally
    use a different credential source.
    '''
    if not isinstance(inputs, MacOSControlLaunchInputs):
        raise TypeError('inputs must be MacOSControlLaunchInputs')
    if inputs.backend_mode:
        if inputs.credentials.rpa_token is None:
            raise ValueError('macOS Control plugin requires YOKO_RPA_TOKEN')
        if inputs.remote_api_base is None:
            raise ValueError('macOS Control plugin requires YOKO_API_BASE')
        if inputs.runtime_id is None:
            raise ValueError('macOS Control plugin requires YOKO_RPA_RUNTIME_ID')
        if inputs.machine_code is None and machine_code_provider is None:
            raise ValueError('macOS Control plugin requires YOKO_RPA_MACHINE_CODE')
        if inputs.machine_code is not None and machine_code_provider is not None and machine_code_provider() != inputs.machine_code:
            raise ValueError('macOS Control machine identity mismatch')
    if not isinstance(secret_store, SecretStore):
        raise TypeError('secret_store must implement SecretStore')
    if not callable(publication_factory):
        raise TypeError('publication_factory must be callable')
    if not callable(auto_reply_service_factory_builder):
        raise TypeError('auto_reply_service_factory_builder must be callable')
    if not inputs.backend_mode and callable(legacy_license_verifier):
        raise TypeError('legacy_license_verifier must be callable')
    if not runtime_lease_transport is not None and isinstance(runtime_lease_transport, YokoRuntimeLeaseTransport):
        raise TypeError('runtime_lease_transport must implement YokoRuntimeLeaseTransport')
    if not machine_code_provider is not None and callable(machine_code_provider):
        raise TypeError('machine_code_provider must be callable')
    if not callable(clock):
        raise TypeError('clock must be callable')
    if not callable(wall_clock):
        raise TypeError('wall_clock must be callable')
    if not callable(sleeper):
        raise TypeError('sleeper must be callable')
    secret_keys = discover_macos_auto_reply_secret_keys(inputs.app_paths.config_root)
    await preload_auto_reply_secrets(secret_store, secret_keys)
    snapshot = <NODE:28>
    resolver = snapshot.resolve
    publication = publication_factory(resolver)
    if not isinstance(publication, MacOSProductStartupPublication):
        raise TypeError('publication_factory must return MacOSProductStartupPublication')
    if _publication_paths(publication) != inputs.app_paths:
        raise ValueError('publication and launch inputs must use the same macOS paths')
    service_factory = auto_reply_service_factory_builder(resolver)
    if not callable(service_factory):
        raise TypeError('auto_reply_service_factory_builder must return a callable')
    runtime_lease_owner = None
    license_service = None
    if inputs.backend_mode:
        if not inputs.machine_code:
            pass
        machine_code = machine_code_provider()
        import re
        if isinstance(machine_code, str) or re.fullmatch('[0-9A-F]{4}(?:-[0-9A-F]{4}){3}', machine_code) is None:
            raise ValueError('YOKO_RPA_MACHINE_CODE is invalid')
        if not seat_transport:
            pass
        seat = None(None, None, (lambda : machine_code), RequestsYokoSeatVerificationTransport(), inputs.credentials.rpa_token, clock, **('api_base', 'channel_id', 'machine_code_provider', 'transport', 'token', 'clock'))
        if not license_transport:
            pass
        license_service = ControlLicenseService(machine_code, secret_store, seat, LegacyLicenseTransport(inputs.remote_api_base, **('api_base',)), clock, **('machine_code', 'secret_store', 'seat_verifier', 'transport', 'clock'))
        if not legacy_license_verifier:
            pass
        access_authorizer = license_service.guard(LegacyCompatibleControlAccessAuthorizer(True, seat, license_service.check_legacy, **('backend_mode', 'seat_verifier', 'legacy_license_verifier')))
    else:
        access_authorizer = LegacyCompatibleControlAccessAuthorizer(False, None, legacy_license_verifier, **('backend_mode', 'seat_verifier', 'legacy_license_verifier'))
# WARNING: Decompyle incomplete

__all__ = [
    'MacOSAutoReplyServiceFactoryBuilder',
    'MacOSControlRuntimePreparation',
    'MacOSProductPublicationFactory',
    'prepare_macos_control_runtime']
