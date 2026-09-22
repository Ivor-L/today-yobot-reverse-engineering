# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_product.marshal (Python 3.9)

'''Fail-closed macOS product-bundle composition candidate.

The stable signing identities, embedded Helper payload and standalone runtime
Helper location are code-owned release policy. User configuration may select
neither peer identity nor Team identifier. Bundle loading remains read-only;
the explicit install function is the only operation here that creates files.
'''
from dataclasses import dataclass
from hashlib import sha256
import os
from pathlib import Path
import platform
import plistlib
import re
import shutil
import site
import sys
import tempfile
from typing import Iterable, Mapping, Optional, Sequence, Tuple
from WeRobotCore.adapters.platform import MacKeychainBackend, MacOSApplicationFacade, MacOSInstalledApplicationResolver, MacOSProcessFacade
from WeRobotCore.adapters.control import ExplicitPathAutoReplyControlState
from WeRobotCore.adapters.auto_reply import MacOSAutoReplyAccountRuntimeFactory
from WeRobotCore.adapters.wechat.macos_ax import MacOSNativeHelperBackend, create_macos_instance_binding_store
from WeRobotCore.application.contacts import AutomationContextContactSyncService
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate
from WeRobotCore.application.runtime import RuntimeCapabilityCatalog
from WeRobotCore.application.monitoring import DiagnosticReporterMonitorTelemetrySink, MonitorTelemetrySink
from macos import MacOSRuntimeBundle, create_macos_contact_sync_service, create_macos_control_helper_client, create_macos_product_runtime_candidate, create_macos_runtime
from macos_capabilities import create_macos_mvp_capability_catalog
from macos_platform import create_macos_platform_services
MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER = 'com.yokowebot.rpa-control'
MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER = 'com.yokowebot.rpa-helper'
MACOS_PRODUCT_TEAM_IDENTIFIER = '2M27ML4PY2'
MACOS_PRODUCT_HELPER_RELATIVE_PATH = Path('Contents/Helpers/YokoRpaDistributionHelper.app')
MACOS_PRODUCT_HELPER_INSTALL_RELATIVE_ROOT = Path('Library/Application Support/YokoWebot/helpers')
MACOS_PRODUCT_HELPER_BUNDLE_NAME = 'YokoRpaDistributionHelper.app'
MACOS_PRODUCT_WECHAT_BUNDLE_IDENTIFIER = 'com.tencent.xinWeChat'
_MAX_INFO_PLIST_BYTES = 262144
_BUNDLE_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.-]{0,63}$')
_APP_VERSION = re.compile('^[A-Za-z0-9][A-Za-z0-9.+-]{0,63}$')
_ARCHITECTURES = frozenset(('arm64', 'x86_64'))

class MacOSProductManifestError(ValueError):
    '''A sanitized signed-bundle layout or identity mismatch.'''
    pass


def _required_manifest_text(info = None, key = None, pattern = None):
    value = info.get(key)
    if not isinstance(value, str) or value.strip():
        raise MacOSProductManifestError('macOS product bundle is missing {}'.format(key))
    normalized = value.strip()
    if pattern is not None and pattern.fullmatch(normalized) is None:
        raise MacOSProductManifestError('macOS product bundle has invalid {}'.format(key))
    return normalized


def _read_info_plist(bundle_path = None, owner = None):
    plist_path = bundle_path / 'Contents' / 'Info.plist'
# WARNING: Decompyle incomplete


def _require_exact(info = None, key = None, expected = None, owner = {
    'info': Mapping[(str, object)],
    'key': str,
    'expected': str,
    'owner': str,
    'return': None }):
    if info.get(key) != expected:
        raise MacOSProductManifestError('{} {} does not match product policy'.format(owner, key))


def _normalized_architecture(value = None):
    architecture = platform.machine() if value is None else value
    if not isinstance(architecture, str):
        raise TypeError('architecture must be a string')
    normalized = architecture.strip().lower()
    if normalized == 'aarch64':
        normalized = 'arm64'
    if normalized not in _ARCHITECTURES:
        raise MacOSProductManifestError('macOS product architecture is unsupported')
    return normalized

MacOSProductBundleManifest = dataclass(True, **('frozen',))(<NODE:12>)

def load_macos_product_bundle_manifest(control_bundle_path = None, *, architecture):
    '''Read the fixed Control/embedded-Helper manifest without native calls.'''
    if not isinstance(control_bundle_path, Path):
        raise TypeError('control_bundle_path must be a pathlib.Path')
    if control_bundle_path.is_absolute() or control_bundle_path.suffix != '.app':
        raise MacOSProductManifestError('control_bundle_path must be an absolute .app bundle')
# WARNING: Decompyle incomplete


def _bundle_content_digest(root = None):
    digest = sha256()
    for path in sorted(root.rglob('*'), (lambda item: item.as_posix()), **('key',)):
        relative = path.relative_to(root).as_posix().encode('utf-8')
        if path.is_symlink():
            digest.update(b'L\x00' + relative + b'\x00')
            digest.update(os.readlink(str(path)).encode('utf-8') + b'\x00')
            continue
        if not path.is_file():
            continue
        digest.update(b'F\x00' + relative + b'\x00')
        with None(None, None, None):
            stream = path.open('rb')
            for chunk in None((lambda : stream.read(1048576)), b''):
                digest.update(chunk)
        with None:
            if not None:
                pass
        digest.update(b'\x00')
    return digest.hexdigest()


def _validate_standalone_helper_bundle(helper_bundle_path = None, manifest = None):
    if not isinstance(helper_bundle_path, Path):
        raise TypeError('helper_bundle_path must be a pathlib.Path')
    if helper_bundle_path.is_absolute() or helper_bundle_path.suffix != '.app':
        raise MacOSProductManifestError('standalone Helper path must be an absolute .app bundle')
# WARNING: Decompyle incomplete


def install_macos_product_helper(manifest = None, *, home_dir):
    '''Install one immutable Helper version outside every enclosing app.

    macOS attributes Screen Recording requests from a nested command-style app
    to its outer bundle. Keeping the signed Helper payload embedded is useful
    for one-file distribution and notarization, but LaunchServices must run an
    identical copy from a top-level app path so Accessibility and Screen
    Recording consistently belong to ``com.yokowebot.rpa-helper``.
    '''
    if not isinstance(manifest, MacOSProductBundleManifest):
        raise TypeError('manifest must be a MacOSProductBundleManifest')
    if not isinstance(home_dir, Path) or home_dir.is_absolute():
        raise ValueError('home_dir must be an absolute pathlib.Path')
    home_root = home_dir.expanduser().resolve()
    install_root = home_root / MACOS_PRODUCT_HELPER_INSTALL_RELATIVE_ROOT / manifest.helper_bundle_version
    target = install_root / MACOS_PRODUCT_HELPER_BUNDLE_NAME
    if target.exists():
        return _validate_standalone_helper_bundle(target, manifest)
    None.mkdir(True, True, **('parents', 'exist_ok'))
    staging_root = Path(tempfile.mkdtemp('.helper-stage-', str(install_root), **('prefix', 'dir')))
    staged = staging_root / MACOS_PRODUCT_HELPER_BUNDLE_NAME
# WARNING: Decompyle incomplete


def verify_macos_product_python_paths(python_search_paths = None, *, user_site_path):
    '''Reject an installed Control that depends on per-user Python packages.'''
    values = sys.path if python_search_paths is None else python_search_paths
    if isinstance(values, (str, bytes)):
        raise TypeError('python_search_paths must be an iterable of paths')
    user_site_value = site.getusersitepackages() if user_site_path is None else user_site_path
    user_site_root = Path(user_site_value).expanduser().resolve()
    normalized = []
# WARNING: Decompyle incomplete

MacOSProductCompositionCandidate = dataclass(True, **('frozen',))(<NODE:12>)

def create_macos_product_composition_candidate(*, control_bundle_path, runtime_helper_bundle_path, application_paths, application_resolver, history_store_factory, contact_store_factory, capability_catalog, home_dir, secret_backend, process_facade, application_facade, native_backend, architecture, python_search_paths, user_site_path, auto_reply_account_runtime_factory, auto_reply_monitor_telemetry, auto_reply_configuration_factory, auto_reply_task_history_factory, monitor_group_chat_lookup):
    '''Build, but never register, the formal macOS product graph.'''
    manifest = load_macos_product_bundle_manifest(control_bundle_path, architecture, **('architecture',))
    helper_bundle_path = manifest.helper_bundle_path
    if runtime_helper_bundle_path is not None:
        helper_bundle_path = _validate_standalone_helper_bundle(runtime_helper_bundle_path, manifest)
    verify_macos_product_python_paths(python_search_paths, user_site_path, **('user_site_path',))
    if application_paths is not None and application_resolver is not None:
        raise ValueError('provide application_paths or application_resolver, not both')
    resolved_application_paths = application_paths
    if resolved_application_paths is not None:
        if not isinstance(resolved_application_paths, Mapping):
            raise TypeError('application_paths must be a mapping')
        if MACOS_PRODUCT_WECHAT_BUNDLE_IDENTIFIER not in resolved_application_paths:
            raise ValueError('application_paths must register the WeChat bundle')
    if resolved_application_paths is None:
        if not application_resolver:
            pass
        resolver = MacOSInstalledApplicationResolver()
        if not isinstance(resolver, MacOSInstalledApplicationResolver):
            raise TypeError('application_resolver must be MacOSInstalledApplicationResolver')
        resolved_application_paths = resolver.resolve_required((MACOS_PRODUCT_WECHAT_BUNDLE_IDENTIFIER,))
    if not capability_catalog:
        pass
    catalog = create_macos_mvp_capability_catalog()
    if not isinstance(catalog, RuntimeCapabilityCatalog):
        raise TypeError('capability_catalog must be RuntimeCapabilityCatalog')
    helper_client = create_macos_control_helper_client(helper_bundle_path, manifest.helper_bundle_version, manifest.team_identifier, manifest.control_bundle_identifier, manifest.helper_bundle_identifier, native_backend, **('helper_bundle_path', 'expected_helper_bundle_version', 'expected_team_identifier', 'expected_control_identifier', 'expected_helper_identifier', 'native_backend'))
    platform_services = create_macos_platform_services(helper_client, resolved_application_paths, home_dir, secret_backend, process_facade, application_facade, **('helper_client', 'application_paths', 'home_dir', 'secret_backend', 'process_facade', 'application_facade'))
    runtime_bundle = create_macos_runtime(helper_client, platform_services, catalog, create_macos_instance_binding_store(platform_services.paths.data_root), monitor_group_chat_lookup, **('helper_client', 'platform_services', 'capability_catalog', 'instance_binding_store', 'monitor_group_chat_lookup'))
    if auto_reply_account_runtime_factory is None:
        auto_reply_account_runtime_factory = MacOSAutoReplyAccountRuntimeFactory(runtime_bundle.driver, contact_store_factory)
    monitor_telemetry = auto_reply_monitor_telemetry
    if monitor_telemetry is None:
        paths = platform_services.paths
        monitor_telemetry = DiagnosticReporterMonitorTelemetrySink(ExplicitPathAutoReplyControlState(paths.data_root / 'runtime', paths.log_root, **('runtime_root', 'log_root')))
    product_runtime = create_macos_product_runtime_candidate(runtime_bundle, history_store_factory, catalog, manifest.app_version, manifest.architecture, auto_reply_account_runtime_factory, monitor_telemetry, auto_reply_configuration_factory, auto_reply_task_history_factory, **('bundle', 'history_store_factory', 'capability_catalog', 'app_version', 'architecture', 'account_runtime_factory', 'monitor_telemetry', 'configuration_factory', 'task_history_factory'))
    return MacOSProductCompositionCandidate(manifest, runtime_bundle, product_runtime, create_macos_contact_sync_service(runtime_bundle, contact_store_factory, **('bundle', 'store_factory')), **('manifest', 'runtime_bundle', 'product_runtime', 'contact_sync'))

