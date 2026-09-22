# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: initialization.marshal (Python 3.9)

'''Windows Legacy initialization backend behind the shared 3C contract.

All native and mature product functions are supplied through one Windows-only
operations facade.  Importing this module is therefore safe on macOS/Linux.
The backend preserves the reviewed Legacy ordering but does not own HTTP,
Pydantic, Scheduler or Narrator projection.
'''
from typing import Any, Mapping, Optional, Protocol, Sequence, Tuple
from WeRobotCore.application.instances import InstanceInitializationBackend, InstanceInitializationBatch, InstanceInitializationResult, InstanceInventorySnapshot
from WeRobotCore.application.instances.inventory import thaw_compatibility_value
from mappers import WINDOWS_LEGACY_DRIVER_ID

class WindowsLegacyInitializationOperations(Protocol):
    '''Mature Windows calls used by the backend, with no cross-platform role.'''
    
    def wake_window(self = None, window_handle = None):
        pass

    
    def detect_build(self = None, window_handle = None):
        pass

    
    def classify_build(self = None, build = None):
        pass

    
    def accessibility_environment_configured(self = None):
        pass

    
    def bootstrap_accessibility(self = None, instances = None):
        pass

    
    def initialize_account(self = None, window_handle = None, account_info = None):
        pass

    
    def bind_account(self = None, account_id = None, window_handle = None):
        pass

    
    def update_account_info(self = None, instance_id = None, account_info = None):
        pass

    
    def resolve_failure_key(self = None, instance = None):
        pass

    
    def record_failure(self = None, account_key = None, version = None):
        pass

    
    def record_success(self = None, account_id = None):
        pass

    
    def was_narrator_fallback_attempted(self = None, account_key = None, version = None):
        pass

    
    def is_higher_than_uia_fallback(self = None, build = None):
        pass

    
    def policy_view(self = None):
        pass

    
    def refresh_active_facades(self = None):
        pass

    
    def sleep(self = None, seconds = None):
        pass

    
    def record_diagnostic(self = None, event_type = None, **details):
        pass



def _require_operations(operations = None):
    required = ('wake_window', 'detect_build', 'classify_build', 'accessibility_environment_configured', 'bootstrap_accessibility', 'initialize_account', 'bind_account', 'update_account_info', 'resolve_failure_key', 'record_failure', 'record_success', 'was_narrator_fallback_attempted', 'is_higher_than_uia_fallback', 'policy_view', 'refresh_active_facades', 'sleep', 'record_diagnostic')
    missing = (lambda .0 = None: [ method_name for method_name in .0 if callable(getattr(operations, method_name, None)) ])(required)
    if missing:
        raise TypeError('operations does not provide required methods: {}'.format(', '.join(missing)))


def _window_handle(raw = None):
    value = raw.get('window_handle')
    if isinstance(value, bool):
        raise ValueError('Windows inventory has an invalid window_handle')
# WARNING: Decompyle incomplete


def _account_info(raw = None):
    value = raw.get('account_info')
    if isinstance(value, Mapping):
        return value


def _activation_item(accessibility = None, window_handle = None):
    by_window = accessibility.get('by_window')
    if not isinstance(by_window, Mapping):
        return { }
    value = None.get(window_handle)
    if value is None:
        value = by_window.get(str(window_handle))
    if isinstance(value, Mapping):
        return value


def _public_accessibility(accessibility = None):
    return (lambda .0: pass# WARNING: Decompyle incomplete
)(accessibility.items())


def _detected_version(classification = None):
    value = classification.get('detected')
    if value is not None:
        return str(value)


class WindowsLegacyInitializationBackend(InstanceInitializationBackend):
    '''Preserve mature Windows preflight, retries and account binding order.'''
    
    def __init__(self = None, operations = None, *, max_retries, retry_delay_seconds):
        _require_operations(operations)
        if isinstance(max_retries, int) or isinstance(max_retries, bool):
            raise TypeError('max_retries must be an integer')
        if max_retries <= 0:
            raise ValueError('max_retries must be positive')
        if isinstance(retry_delay_seconds, bool):
            raise TypeError('retry_delay_seconds must be numeric')
    # WARNING: Decompyle incomplete

    
    async def initialize(self = None, inventory = None):
        if not isinstance(inventory, InstanceInventorySnapshot):
            raise TypeError('inventory must be an InstanceInventorySnapshot')
        if inventory.driver_id != WINDOWS_LEGACY_DRIVER_ID:
            raise ValueError('Windows backend requires the Windows Legacy driver')
        if not inventory.items:
            return InstanceInitializationBatch(inventory.driver_id, **('driver_id',))
        raw_instances = None((lambda .0: for item in .0:
thaw_compatibility_value(item.compatibility_payload))(inventory.items))
        handles = tuple((lambda .0: for raw in .0:
_window_handle(raw))(raw_instances))
        for handle in handles:
            self._operations.wake_window(handle)
        environment_configured = self._operations.accessibility_environment_configured()
        detected_builds = None((lambda .0 = None: for handle in .0:
self._operations.detect_build(handle))(handles))
        classifications = None((lambda .0 = None: for build in .0:
self._classification(build))(detected_builds))
        too_high = tuple((lambda .0: 