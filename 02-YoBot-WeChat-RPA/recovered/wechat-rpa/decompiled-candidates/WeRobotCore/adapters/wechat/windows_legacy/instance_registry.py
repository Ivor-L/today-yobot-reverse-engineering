# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_registry.marshal (Python 3.9)

'''Instance registry adapter for the mature Windows InstanceManager.

The adapter deliberately receives an already-created manager facade.  Keeping
that dependency injected makes this module importable on macOS/Linux and, more
importantly, prevents a second ``InstanceManagerV2`` singleton lifecycle from
being introduced by the cross-platform runtime.

This boundary only adopts records that the Legacy manager already knows.  It
does not initialize WeChat, switch the active account, create UIA objects, or
replace the production ``/api/init/multi`` flow.
'''
from typing import Any, Dict, Mapping, Optional, Protocol, Sequence, Set
from WeRobotCore.domain import AccountInstance, AutomationError, CapabilityName, CapabilityState, CapabilityStatus, ErrorCode, InstanceId, OperationResult
from WeRobotCore.ports.wechat import NativeInstanceRef
from mappers import WINDOWS_LEGACY_DRIVER_ID, map_legacy_instance

class LegacyInstanceManagerFacade(Protocol):
    '''Small stable surface consumed from InstanceManagerV2/V3.

    The concrete Windows class is intentionally not imported here.  A Windows
    composition root will inject the production singleton; tests inject a pure
    in-memory facade.
    '''
    
    def list_instances(self = None):
        pass

    
    def get_instance_info(self = None, instance_id = None):
        pass

    
    def exit_instance(self = None, instance_id = None):
        pass

    
    def re_enter_instance(self = None, instance_id = None):
        pass



def _default_capabilities():
    names = (CapabilityName.INSTANCE_ATTACH, CapabilityName.ACCOUNT_READ_CURRENT)
    return (lambda .0: pass# WARNING: Decompyle incomplete
)(names)


class WindowsInstanceRegistryAdapter:
    '''Adapt existing InstanceManager records to the neutral registry Port.

    ``attach`` means adopting an existing Legacy record into this registry.  A
    newly discovered, uninitialized record therefore remains ``DISCOVERED``;
    the adapter never promotes it by calling Legacy initialization routines.
    '''
    platform = 'windows'
    
    def __init__(self = None, manager = None, capabilities = None, resume_manually_exited_on_attach = (None, False)):
        if manager is None:
            raise ValueError('manager must be provided')
        self._manager = manager
        self._capabilities = dict(_default_capabilities() if capabilities is None else capabilities)
        self._resume_manually_exited_on_attach = bool(resume_manually_exited_on_attach)
        self._attached_ids = set()

    
    def _instance_key(raw = None):
        value = raw.get('instance_id') if isinstance(raw, Mapping) else None
        key = '' if value is None else str(value).strip()
        if not key:
            raise AutomationError(ErrorCode.OPERATION_FAILED, 'Legacy InstanceManager returned a record without instance_id')
        return key

    _instance_key = None(_instance_key)
    
    def _process_id(raw = None):
        value = raw.get('process_id')
        if value is None:
            return None
        if None(value, bool):
            raise AutomationError(ErrorCode.OPERATION_FAILED, 'Legacy InstanceManager returned an invalid process_id')
    # WARNING: Decompyle incomplete

    _process_id = None(_process_id)
    
    def _native_ref(cls = None, raw = None):
        return NativeInstanceRef(cls.platform, cls._instance_key(raw), cls._process_id(raw), **('platform', 'native_key', 'process_id'))

    _native_ref = None(_native_ref)
    
    def _read_record(self = None, instance_key = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _map_instance(self = None, raw = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _validate_ref(ref = None):
        if not isinstance(ref, NativeInstanceRef):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'ref must be a NativeInstanceRef')
        if ref.platform.strip().lower() != WindowsInstanceRegistryAdapter.platform:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'native instance belongs to platform {}'.format(ref.platform))
        if ref.payload is not None:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'Windows native references must not carry public payloads')
        return ref.native_key

    _validate_ref = None(_validate_ref)
    
    def _validate_instance_id(instance_id = None):
        if not isinstance(instance_id, InstanceId):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'instance_id must be an InstanceId')
        return instance_id.value

    _validate_instance_id = None(_validate_instance_id)
    
    async def discover(self = None):
        '''Reuse one mature ``list_instances`` pass, including its discovery.

        ``InstanceManagerV2.list_instances`` already performs validity cleanup
        and native discovery.  Calling either operation again here would double
        the observable Legacy side effects.
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def attach(self = None, ref = None):
        '''Adopt one Legacy record without running WeChat initialization.'''
        instance_key = self._validate_ref(ref)
        raw = self._read_record(instance_key)
        if raw is None:
            raise AutomationError(ErrorCode.INSTANCE_NOT_FOUND, 'Legacy instance was not found: {}'.format(instance_key))
        record_process_id = self._process_id(raw)
        if ref.process_id is not None and record_process_id is not None and ref.process_id != record_process_id:
            raise AutomationError(ErrorCode.INSTANCE_NOT_FOUND, 'native instance reference is stale: {}'.format(instance_key))
    # WARNING: Decompyle incomplete

    
    async def detach(self = None, instance_id = None):
        """Stop adapter management using Legacy's non-destructive exit flag."""
        instance_key = self._validate_instance_id(instance_id)
    # WARNING: Decompyle incomplete

    
    async def list_attached(self = None):
        result = []
        missing = []
        for instance_key in sorted(self._attached_ids):
            raw = self._read_record(instance_key)
            if raw is None:
                missing.append(instance_key)
                continue
            result.append(self._map_instance(raw))
        for instance_key in missing:
            self._attached_ids.discard(instance_key)
        return tuple(result)

    
    async def get_by_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'account_id must be a non-empty string')
        normalized = account_id.strip()
        await self.list_attached()
        for instance in <NODE:28>:
            if instance.account_id == normalized:
                return instance
            return None


