# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_ax.marshal (Python 3.9)

'''Signed-Helper-backed macOS WeChat Driver foundation.'''
from driver import MACOS_AX_DRIVER_ID, MACOS_CURRENT_ACCOUNT_ATTACH_CONFIRMATION, MacOSAxDriver, MacOSHelperAction
from ipc import MACOS_HELPER_MAX_FRAME_BYTES, MACOS_HELPER_PROTOCOL_VERSION, MacOSHelperCallError, MacOSHelperClient, MacOSHelperSession, MacOSHelperSessionFactory, MacOSHelperTransport, SessionMacOSHelperTransport, map_helper_error_code
from mappers import MacOSDriverMapper, MacOSHelperPayloadError
from native_transport import MacOSControlHelperSession, MacOSControlHelperSessionFactory, MacOSNativeHelperBackend, MacOSNativeHelperConnection, MacOSNativeTransportError, PyObjCMacOSHelperBackend, verify_current_macos_control_identity
from instance_lifecycle import MacOSInstanceInitializationBackend, MacOSInstanceInventorySource
from instance_binding import MACOS_INSTANCE_BINDING_FILE_NAME, MACOS_INSTANCE_BINDING_SCHEMA_VERSION, MacOSInstanceBindingStore, MacOSPersistedInstanceBinding, create_macos_instance_binding_store
from instance_compatibility import create_macos_instance_version_facts, project_macos_legacy_active_instances_response, project_macos_legacy_agent_instances_status, project_macos_legacy_all_instances_response
from monitor_session_source import MacOSMonitorSessionSource, map_macos_monitor_session_batch
from monitor_runtime_source import MacOSMonitorRuntimeSource
from startup import MACOS_STARTUP_REQUIRED_PERMISSIONS, MACOS_STARTUP_WECHAT_APPLICATION_ID, MacOSStartupBackend, MacOSStartupInitialization
__all__ = [
    'MACOS_AX_DRIVER_ID',
    'MACOS_CURRENT_ACCOUNT_ATTACH_CONFIRMATION',
    'MACOS_HELPER_MAX_FRAME_BYTES',
    'MACOS_HELPER_PROTOCOL_VERSION',
    'MacOSAxDriver',
    'MacOSControlHelperSession',
    'MacOSControlHelperSessionFactory',
    'MacOSDriverMapper',
    'MacOSHelperAction',
    'MacOSHelperCallError',
    'MacOSHelperClient',
    'MacOSHelperPayloadError',
    'MacOSHelperSession',
    'MacOSHelperSessionFactory',
    'MacOSHelperTransport',
    'SessionMacOSHelperTransport',
    'MacOSInstanceInitializationBackend',
    'MacOSInstanceInventorySource',
    'MACOS_INSTANCE_BINDING_FILE_NAME',
    'MACOS_INSTANCE_BINDING_SCHEMA_VERSION',
    'MacOSInstanceBindingStore',
    'MacOSPersistedInstanceBinding',
    'create_macos_instance_binding_store',
    'create_macos_instance_version_facts',
    'project_macos_legacy_active_instances_response',
    'project_macos_legacy_agent_instances_status',
    'project_macos_legacy_all_instances_response',
    'MacOSMonitorSessionSource',
    'MacOSMonitorRuntimeSource',
    'MacOSNativeHelperBackend',
    'MacOSNativeHelperConnection',
    'MacOSNativeTransportError',
    'MACOS_STARTUP_REQUIRED_PERMISSIONS',
    'MACOS_STARTUP_WECHAT_APPLICATION_ID',
    'MacOSStartupBackend',
    'MacOSStartupInitialization',
    'PyObjCMacOSHelperBackend',
    'verify_current_macos_control_identity',
    'map_macos_monitor_session_batch',
    'map_helper_error_code']
