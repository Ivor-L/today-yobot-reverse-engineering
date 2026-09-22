# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_lifecycle.marshal (Python 3.9)

'''macOS instance inventory and initialization adapters for shared startup.'''
import asyncio
import logging
from typing import Optional
from WeRobotCore.application.instances import InstanceInitializationBackend, InstanceInitializationBatch, InstanceInitializationResult, InstanceInventoryItem, InstanceInventorySnapshot, InstanceInventorySource
from WeRobotCore.domain import AccountInstance, AutomationError, ErrorCode, InstanceId, InstanceState
from WeRobotCore.ports import NativeInstanceRef
from driver import MacOSAxDriver
from instance_binding import MacOSInstanceBindingStore, MacOSPersistedInstanceBinding
from ipc import MacOSHelperCallError
_logger = logging.getLogger(__name__)
_TRANSIENT_DISCOVERY_HELPER_CODES = frozenset({
    'WECHAT_MAIN_WINDOW_NOT_FOUND',
    'WECHAT_ANCHOR_INVALID'})
_TRANSIENT_DISCOVERY_RETRY_SECONDS = 0.3
_REQUIRED_ACTIONS = {
    ErrorCode.INSTANCE_NOT_READY: ('verify_wechat_login', 'retry'),
    ErrorCode.INSTANCE_NOT_FOUND: ('open_wechat', 'retry'),
    ErrorCode.CLIENT_VERSION_UNSUPPORTED: ('install_supported_wechat_version',),
    ErrorCode.ACCOUNT_NOT_INITIALIZED: ('verify_wechat_login', 'retry'),
    ErrorCode.PERMISSION_REQUIRED: ('request_permission',) }

class MacOSInstanceInventorySource(InstanceInventorySource):
    '''Project one passive Helper discovery into the shared inventory DTO.'''
    
    def __init__(self = None, driver = None, binding_store = None):
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be a MacOSAxDriver')
        if not binding_store is not None and isinstance(binding_store, MacOSInstanceBindingStore):
            raise TypeError('binding_store must be a MacOSInstanceBindingStore')
        self._driver = driver
        self._binding_store = binding_store

    
    async def snapshot(self = None):
        pass
    # WARNING: Decompyle incomplete



class MacOSInstanceInitializationBackend(InstanceInitializationBackend):
    '''Attach each ordered inventory item and preserve shared result rules.'''
    
    def __init__(self = None, driver = None, binding_store = None):
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be a MacOSAxDriver')
        if not binding_store is not None and isinstance(binding_store, MacOSInstanceBindingStore):
            raise TypeError('binding_store must be a MacOSInstanceBindingStore')
        self._driver = driver
        self._binding_store = binding_store

    
    def confirm_visible_current_account_once(self = None, confirmation = None):
        '''Retain the pre-G5I source harness call as a no-state shim.'''
        self._driver.confirm_visible_current_account_once(confirmation)

    
    def _native_ref(item = None):
        payload = item.compatibility_payload
        if payload.get('platform') != 'darwin':
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'macOS inventory item has an invalid platform')
        process_id = payload.get('process_id')
        if isinstance(process_id, int) and isinstance(process_id, bool) or process_id <= 0:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'macOS inventory item has an invalid process_id')
        return NativeInstanceRef('darwin', item.instance.instance_id.value, process_id, **('platform', 'native_key', 'process_id'))

    _native_ref = None(_native_ref)
    
    def _failure(instance_id = None, exc = None):
        return InstanceInitializationResult(instance_id, False, exc.code.value, str(exc), exc.retryable, _REQUIRED_ACTIONS.get(exc.code, ('retry',)), {
            'instance_id': instance_id.value }, **('instance_id', 'success', 'failure_code', 'message', 'retryable', 'required_actions', 'compatibility_payload'))

    _failure = None(_failure)
    
    async def initialize(self = None, inventory = None):
        if not isinstance(inventory, InstanceInventorySnapshot):
            raise TypeError('inventory must be an InstanceInventorySnapshot')
        if inventory.driver_id != self._driver.driver_id:
            raise ValueError('inventory belongs to another driver')
        results = []
    # WARNING: Decompyle incomplete


