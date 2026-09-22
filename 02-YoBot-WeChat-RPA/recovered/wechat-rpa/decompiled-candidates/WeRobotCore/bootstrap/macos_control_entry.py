# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_control_entry.marshal (Python 3.9)

'''Production composition roots for the macOS Control process.

This module is imported only after the signed entry has selected an explicit
startup mode.  Plugin and standalone launches share the same reviewed product,
process and Host owners; only their authorization adapters and frontend inputs
differ.  No function in this module starts the server.  Standalone activation,
entry publication and Capability publication remain separate release gates.
'''
from __future__ import annotations
from pathlib import Path
from typing import Iterable, Mapping, Optional, Sequence
from WeRobotCore.adapters.platform import MacKeychainSecretStore, MacSecurityKeychainBackend
from WeRobotCore.application.control_access import ControlLegacyLicenseVerifier
from WeRobotCore.host.control_app import FrontendDirectory
from WeRobotCore.host.macos_launch import resolve_macos_control_launch_inputs
from WeRobotCore.host.macos_process import MacOSControlProcessRuntime, bind_macos_control_process_runtime
from WeRobotCore.host.macos_runtime import prepare_macos_control_runtime
from WeRobotCore.packaging import resolve_macos_control_frontend_directory
from WeRobotCore.utils.logger import configure_log_root
from macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_control_process import create_macos_control_process_dependencies
from macos_control_product import MacOSControlProductOwner
from macos_product import install_macos_product_helper, load_macos_product_bundle_manifest

async def _prepare_macos_control_process(*, arguments, environment, home_dir, control_bundle_path, expected_backend_mode, legacy_license_verifier, frontend_directory, experimental_capabilities):
    '''Prepare one Control runtime for an already-selected startup channel.

    The function consumes explicit process snapshots, validates the signed
    product layout before claiming task singletons, shares one Keychain backend
    between startup preloading and platform services, and stops before socket
    creation.  The caller must select exactly one authorization channel before
    this common product graph can be composed.
    '''
    if not isinstance(expected_backend_mode, bool):
        raise TypeError('expected_backend_mode must be a boolean')
    if not expected_backend_mode and callable(legacy_license_verifier):
        raise TypeError('legacy_license_verifier must be callable')
    if isinstance(experimental_capabilities, (str, bytes)):
        raise TypeError('experimental_capabilities must be an iterable of strings')
    capability_names = tuple(experimental_capabilities)
    if any((lambda .0: for name in .0:
not isinstance(name, str))(capability_names)):
        raise TypeError('experimental_capabilities must contain only strings')
    inputs = resolve_macos_control_launch_inputs(arguments, environment, home_dir, **('arguments', 'environment', 'home_dir'))
    if inputs.backend_mode is not expected_backend_mode:
        if expected_backend_mode:
            raise ValueError('macOS Control plugin startup requires --no-ui')
        raise ValueError('macOS Control standalone startup rejects --no-ui')
    if expected_backend_mode:
        if inputs.credentials.rpa_token is None:
            raise ValueError('macOS Control plugin startup requires YOKO_RPA_TOKEN')
        if inputs.remote_api_base is None:
            raise ValueError('macOS Control plugin startup requires YOKO_API_BASE')
        if inputs.runtime_id is None:
            raise ValueError('macOS Control plugin startup requires YOKO_RPA_RUNTIME_ID')
        if inputs.machine_code is None:
            raise ValueError('macOS Control plugin startup requires YOKO_RPA_MACHINE_CODE')
        if inputs.credentials.local_api_key == 'yoko_test':
            raise ValueError('macOS Control plugin requires a runtime loopback credential')
    manifest = load_macos_product_bundle_manifest(control_bundle_path)
    if expected_backend_mode and frontend_directory is None:
        frontend_directory = resolve_macos_control_frontend_directory(control_bundle_path)
    runtime_helper_bundle_path = install_macos_product_helper(manifest, home_dir, **('home_dir',))
    configure_log_root(inputs.app_paths.log_root)
    keychain_backend = MacSecurityKeychainBackend()
    secret_store = MacKeychainSecretStore(keychain_backend, **('backend',))
    dependencies = create_macos_control_process_dependencies(inputs.app_paths, **('paths',))
    product_owner_arguments = dict(control_bundle_path, runtime_helper_bundle_path, home_dir, dependencies.auto_reply_manager, dependencies.multi_chat_monitor, dependencies.private_agent_probe, keychain_backend, **('control_bundle_path', 'runtime_helper_bundle_path', 'home_dir', 'auto_reply_manager', 'multi_chat_monitor', 'private_agent_probe', 'secret_backend'))
    if getattr(dependencies, 'mass_sending_manager', None) is not None:
        product_owner_arguments['mass_sending_manager'] = dependencies.mass_sending_manager
    if getattr(dependencies, 'auto_follow_manager', None) is not None:
        product_owner_arguments['auto_follow_manager'] = dependencies.auto_follow_manager
    if getattr(dependencies, 'moment_comment_manager', None) is not None:
        product_owner_arguments['moment_comment_manager'] = dependencies.moment_comment_manager
    if getattr(dependencies, 'moment_post_manager', None) is not None:
        product_owner_arguments['moment_post_manager'] = dependencies.moment_post_manager
    if getattr(dependencies, 'add_friend_manager', None) is not None:
        product_owner_arguments['add_friend_manager'] = dependencies.add_friend_manager
    if getattr(dependencies, 'friend_request_manager', None) is not None:
        product_owner_arguments['friend_request_manager'] = dependencies.friend_request_manager
    if getattr(dependencies, 'sync_contacts_manager', None) is not None:
        product_owner_arguments['sync_contacts_manager'] = dependencies.sync_contacts_manager
    if capability_names:
        product_owner_arguments['experimental_capabilities'] = capability_names
# WARNING: Decompyle incomplete


async def prepare_macos_control_plugin_process(*, arguments, environment, home_dir, control_bundle_path):
    '''Prepare the established YokoAgent ``--no-ui`` plugin runtime.'''
    await _prepare_macos_control_process(arguments, environment, home_dir, control_bundle_path, True, None, MACOS_MVP_CAPABILITY_NAMES, **('arguments', 'environment', 'home_dir', 'control_bundle_path', 'expected_backend_mode', 'legacy_license_verifier', 'experimental_capabilities'))
    runtime = <NODE:28>
    install_macos_business_routes = install_macos_business_routes
    import WeRobotCore.host.macos_business_routes
    install_macos_business_routes(runtime)
    return runtime


async def prepare_macos_control_standalone_process(*, arguments, environment, home_dir, control_bundle_path, legacy_license_verifier, frontend_directory, experimental_capabilities):
    '''Prepare standalone Control without publishing an executable entry.

    The verifier and optional frontend are supplied by the standalone product
    adapter.  Keeping them outside the shared graph lets a future Mac-specific
    authorization channel evolve independently from the YokoAgent seat channel
    without duplicating RPA or auto-reply business logic.
    '''
    await _prepare_macos_control_process(arguments, environment, home_dir, control_bundle_path, False, legacy_license_verifier, frontend_directory, experimental_capabilities, **('arguments', 'environment', 'home_dir', 'control_bundle_path', 'expected_backend_mode', 'legacy_license_verifier', 'frontend_directory', 'experimental_capabilities'))
    return <NODE:28>

__all__ = [
    'prepare_macos_control_plugin_process',
    'prepare_macos_control_standalone_process']
