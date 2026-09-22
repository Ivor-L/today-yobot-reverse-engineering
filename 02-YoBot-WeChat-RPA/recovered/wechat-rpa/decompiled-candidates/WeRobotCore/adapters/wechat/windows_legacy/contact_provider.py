# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: contact_provider.marshal (Python 3.9)

'''Contact/group snapshot provider backed by an injected Legacy facade.'''
from typing import Sequence
from WeRobotCore.domain import AutomationError, ContactRecord, ErrorCode, GroupRecord, InstanceId
from WeRobotCore.ports.wechat import InstanceRegistry
from bindings import require_ready_account
from facades import LegacyContactSnapshotFacade
from mappers import map_legacy_contacts, map_legacy_groups

class WindowsLegacyContactProviderAdapter:
    '''Normalize mature Windows snapshots without owning sync or storage.'''
    
    def __init__(self = None, instances = None, contacts = None):
        if instances is None or contacts is None:
            raise ValueError('instances and contacts must be provided')
        self._instances = instances
        self._contacts = contacts

    
    def _validate_sequence(raw = None, operation = None):
        if isinstance(raw, Sequence) or isinstance(raw, (str, bytes)):
            raise AutomationError(ErrorCode.OPERATION_FAILED, 'Legacy {} returned a non-sequence result'.format(operation))
        return raw

    _validate_sequence = None(_validate_sequence)
    
    async def list_contacts(self = None, instance_id = None):
        await require_ready_account(self._instances, instance_id)
        instance = <NODE:28>
    # WARNING: Decompyle incomplete

    
    async def list_groups(self = None, instance_id = None):
        await require_ready_account(self._instances, instance_id)
        instance = <NODE:28>
    # WARNING: Decompyle incomplete


