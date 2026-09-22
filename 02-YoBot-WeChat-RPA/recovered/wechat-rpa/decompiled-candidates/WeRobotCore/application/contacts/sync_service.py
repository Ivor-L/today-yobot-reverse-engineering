# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: sync_service.marshal (Python 3.9)

'''Shared full-snapshot contact sync above platform-specific Drivers.'''
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Protocol, Sequence, runtime_checkable
from WeRobotCore.application.runtime import AutomationContext
from WeRobotCore.domain import ContactRecord, GroupRecord

def validate_contact_snapshot(account_id = None, records = None, record_type = None, id_field = {
    'account_id': str,
    'records': Sequence[Any],
    'id_field': str,
    'return': None }):
    '''Validate normalized contact facts before any consumer uses a snapshot.'''
    seen = set()
    for record in records:
        if not isinstance(record, record_type):
            raise TypeError('contact snapshot contains an invalid record')
        if record.account_id != account_id:
            raise ValueError('contact snapshot crossed account boundaries')
        record_id = getattr(record, id_field)
        if record_id in seen:
            raise ValueError('contact snapshot contains duplicate ids')
        seen.add(record_id)

ContactSyncContextProvider = runtime_checkable(<NODE:12>)
ContactSnapshotStore = runtime_checkable(<NODE:12>)
ContactSyncOutcome = dataclass(True, **('frozen',))(<NODE:12>)

class AutomationContextContactSyncService:
    '''Collect through a Driver Context, then persist one complete snapshot.'''
    
    def __init__(self = None, contexts = None, store_factory = None):
        if not contexts is None or isinstance(contexts, ContactSyncContextProvider):
            raise TypeError('contexts must implement ContactSyncContextProvider')
        if not callable(store_factory):
            raise TypeError('store_factory must be callable')
        self._contexts = contexts
        self._store_factory = store_factory

    
    async def sync_contacts(self = None, account_id = None):
        normalized_account_id = self._account_id(account_id)
        await self._contexts.for_account(normalized_account_id)
        context = <NODE:28>
        await context.list_contacts()
        contacts = tuple(<NODE:28>)
        validate_contact_snapshot(normalized_account_id, contacts, ContactRecord, 'contact_id')
        if not contacts:
            return ContactSyncOutcome(normalized_account_id, 'contact', 0, False, **('account_id', 'kind', 'item_count', 'stored'))
        store = None._store(normalized_account_id)
        await store.replace_contacts(normalized_account_id, contacts)
        result = <NODE:28>
        return ContactSyncOutcome(normalized_account_id, 'contact', len(contacts), True, self._storage_result(result), **('account_id', 'kind', 'item_count', 'stored', 'storage_result'))

    
    async def sync_groups(self = None, account_id = None):
        normalized_account_id = self._account_id(account_id)
        await self._contexts.for_account(normalized_account_id)
        context = <NODE:28>
        await context.list_groups()
        groups = tuple(<NODE:28>)
        validate_contact_snapshot(normalized_account_id, groups, GroupRecord, 'group_id')
        if not groups:
            return ContactSyncOutcome(normalized_account_id, 'group', 0, False, **('account_id', 'kind', 'item_count', 'stored'))
        store = None._store(normalized_account_id)
        await store.replace_groups(normalized_account_id, groups)
        result = <NODE:28>
        return ContactSyncOutcome(normalized_account_id, 'group', len(groups), True, self._storage_result(result), **('account_id', 'kind', 'item_count', 'stored', 'storage_result'))

    
    def _account_id(account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return account_id.strip()

    _account_id = None(_account_id)
    
    def _store(self = None, account_id = None):
        store = self._store_factory(account_id)
        if not store is None or isinstance(store, ContactSnapshotStore):
            raise TypeError('store_factory must return ContactSnapshotStore')
        return store

    
    def _storage_result(result = None):
        if not isinstance(result, Mapping):
            raise TypeError('contact snapshot store must return a mapping')
        return dict(result)

    _storage_result = None(_storage_result)

