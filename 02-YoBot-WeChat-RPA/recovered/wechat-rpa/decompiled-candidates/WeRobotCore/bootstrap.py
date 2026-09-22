# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: bootstrap.marshal (Python 3.9)

'''Composition roots for platform-specific runtimes.'''
from fake import FakeRuntimeBundle, create_fake_runtime
from windows_legacy import WindowsLegacyRuntimeBundle, bind_existing_windows_legacy_dependencies, create_windows_auto_reply_runtime_bindings, create_windows_legacy_runtime, create_windows_product_runtime_candidate
from windows_platform import create_windows_legacy_platform_services
from windows_product import register_existing_windows_product_runtime
from windows_capabilities import WINDOWS_LEGACY_SUPPORTED_PRODUCT_CAPABILITIES, create_windows_legacy_product_capability_catalog
from windows_product_secrets import WINDOWS_PRODUCT_SECRET_PATHS, create_windows_product_secret_backend
from product_runtime_mode import PRODUCT_RUNTIME_MODE_ENV, ProductRuntimeMode, resolve_product_runtime_mode
from auto_reply_control import create_legacy_auto_reply_control_service
from macos_secret_migration import MACOS_PLAINTEXT_SECRET_MIGRATION_KEYS, MacPlaintextSecretSource, migrate_macos_plaintext_secret
from macos import MacOSRuntimeBundle, create_macos_auto_reply_runtime_bindings, create_macos_control_helper_client, create_macos_contact_sync_service, create_macos_product_runtime_candidate, create_macos_runtime
from macos_capabilities import MACOS_MVP_CAPABILITY_NAMES, create_macos_mvp_capability_catalog
from macos_platform import create_macos_platform_services
from macos_product import MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER, MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER, MACOS_PRODUCT_HELPER_RELATIVE_PATH, MACOS_PRODUCT_HELPER_INSTALL_RELATIVE_ROOT, MACOS_PRODUCT_TEAM_IDENTIFIER, MACOS_PRODUCT_WECHAT_BUNDLE_IDENTIFIER, MacOSProductBundleManifest, MacOSProductCompositionCandidate, MacOSProductManifestError, create_macos_product_composition_candidate, install_macos_product_helper, load_macos_product_bundle_manifest, verify_macos_product_python_paths
from macos_startup import create_macos_startup_workflow, register_macos_startup_workflow
from macos_product_startup import MacOSProductStartupPublication, MacOSProductStartupRegistration
from macos_control import MacOSAutoReplyRuntimeConfigurationFactory, create_macos_auto_reply_config_factory, create_macos_auto_reply_history_factory, create_macos_contact_store, create_macos_auto_reply_control_service, create_macos_auto_reply_control_state
from macos_control_product import MacOSControlProductOwner
from macos_control_process import MacOSControlProcessDependencies, MacOSTaskSystemLifecycle, create_macos_control_process_dependencies, probe_private_agent_capabilities
from windows_startup import register_windows_startup_workflow
__all__ = [
    'FakeRuntimeBundle',
    'WindowsLegacyRuntimeBundle',
    'bind_existing_windows_legacy_dependencies',
    'create_windows_auto_reply_runtime_bindings',
    'create_windows_product_runtime_candidate',
    'create_fake_runtime',
    'create_windows_legacy_runtime',
    'create_windows_legacy_platform_services',
    'create_windows_legacy_product_capability_catalog',
    'create_windows_product_secret_backend',
    'create_legacy_auto_reply_control_service',
    'migrate_macos_plaintext_secret',
    'register_existing_windows_product_runtime',
    'register_windows_startup_workflow',
    'PRODUCT_RUNTIME_MODE_ENV',
    'ProductRuntimeMode',
    'WINDOWS_LEGACY_SUPPORTED_PRODUCT_CAPABILITIES',
    'WINDOWS_PRODUCT_SECRET_PATHS',
    'MACOS_PLAINTEXT_SECRET_MIGRATION_KEYS',
    'MacPlaintextSecretSource',
    'MacOSRuntimeBundle',
    'MACOS_MVP_CAPABILITY_NAMES',
    'create_macos_mvp_capability_catalog',
    'create_macos_platform_services',
    'create_macos_auto_reply_runtime_bindings',
    'create_macos_control_helper_client',
    'create_macos_contact_sync_service',
    'create_macos_product_runtime_candidate',
    'MACOS_PRODUCT_CONTROL_BUNDLE_IDENTIFIER',
    'MACOS_PRODUCT_HELPER_BUNDLE_IDENTIFIER',
    'MACOS_PRODUCT_HELPER_RELATIVE_PATH',
    'MACOS_PRODUCT_HELPER_INSTALL_RELATIVE_ROOT',
    'MACOS_PRODUCT_TEAM_IDENTIFIER',
    'MACOS_PRODUCT_WECHAT_BUNDLE_IDENTIFIER',
    'MacOSProductBundleManifest',
    'MacOSProductCompositionCandidate',
    'MacOSProductManifestError',
    'create_macos_product_composition_candidate',
    'install_macos_product_helper',
    'load_macos_product_bundle_manifest',
    'verify_macos_product_python_paths',
    'register_macos_startup_workflow',
    'create_macos_startup_workflow',
    'MacOSProductStartupPublication',
    'MacOSProductStartupRegistration',
    'create_macos_auto_reply_control_service',
    'create_macos_auto_reply_control_state',
    'create_macos_auto_reply_config_factory',
    'create_macos_auto_reply_history_factory',
    'create_macos_contact_store',
    'MacOSAutoReplyRuntimeConfigurationFactory',
    'MacOSControlProductOwner',
    'MacOSControlProcessDependencies',
    'MacOSTaskSystemLifecycle',
    'create_macos_control_process_dependencies',
    'probe_private_agent_capabilities',
    'create_macos_runtime',
    'resolve_product_runtime_mode']
