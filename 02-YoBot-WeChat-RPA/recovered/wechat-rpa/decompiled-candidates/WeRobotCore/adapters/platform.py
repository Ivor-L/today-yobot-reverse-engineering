# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: platform.marshal (Python 3.9)

'''Platform adapter implementations.'''
from fake import FakeApplicationLauncher, FakeAppPaths, FakeProcessManager, InMemorySecretStore, StaticPermissionService
from macos_keychain import MACOS_KEYCHAIN_SERVICE, MacKeychainBackend, MacKeychainBackendError, MacKeychainSecretStore, MacSecurityKeychainBackend
from macos_native import MACOS_ACCESSIBILITY_PERMISSION, MACOS_CONTROL_BUNDLE_IDENTIFIER, MACOS_SCREEN_RECORDING_PERMISSION, MACOS_WECHAT_APP_DATA_PERMISSION, MacOSApplicationFacade, MacOSApplicationLocationFacade, MacOSAppPaths, MacOSBundleApplicationLauncher, MacOSHelperPermissionService, MacOSInstalledApplicationResolver, MacOSNativeApplicationFacade, MacOSNativeApplicationLocationFacade, MacOSNativeProcessFacade, MacOSProcessFacade, MacOSProcessManagerAdapter
from windows_legacy import WINDOWS_DESKTOP_INTERACTION_PERMISSION, CallbackSecretValueBackend, LegacySecretValueBackend, SecretProtector, WindowsDesktopPermissionService, WindowsDpapiProtector, WindowsDpapiSecretStore, WindowsExecutableApplicationLauncher, WindowsLegacyAppPaths, WindowsNativeProcessFacade, WindowsProcessFacade, WindowsProcessManagerAdapter
__all__ = [
    'FakeApplicationLauncher',
    'FakeAppPaths',
    'FakeProcessManager',
    'InMemorySecretStore',
    'StaticPermissionService',
    'MACOS_KEYCHAIN_SERVICE',
    'MacKeychainBackend',
    'MacKeychainBackendError',
    'MacKeychainSecretStore',
    'MacSecurityKeychainBackend',
    'MACOS_ACCESSIBILITY_PERMISSION',
    'MACOS_CONTROL_BUNDLE_IDENTIFIER',
    'MACOS_SCREEN_RECORDING_PERMISSION',
    'MACOS_WECHAT_APP_DATA_PERMISSION',
    'MacOSApplicationFacade',
    'MacOSApplicationLocationFacade',
    'MacOSAppPaths',
    'MacOSBundleApplicationLauncher',
    'MacOSHelperPermissionService',
    'MacOSInstalledApplicationResolver',
    'MacOSNativeApplicationFacade',
    'MacOSNativeApplicationLocationFacade',
    'MacOSNativeProcessFacade',
    'MacOSProcessFacade',
    'MacOSProcessManagerAdapter',
    'WINDOWS_DESKTOP_INTERACTION_PERMISSION',
    'CallbackSecretValueBackend',
    'LegacySecretValueBackend',
    'SecretProtector',
    'WindowsDesktopPermissionService',
    'WindowsDpapiProtector',
    'WindowsDpapiSecretStore',
    'WindowsExecutableApplicationLauncher',
    'WindowsLegacyAppPaths',
    'WindowsNativeProcessFacade',
    'WindowsProcessFacade',
    'WindowsProcessManagerAdapter']
