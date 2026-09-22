# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: legacy_database.marshal (Python 3.9)

'''Adapter from normalized records to the established local SQLite contract.'''
import asyncio
from typing import Any, Callable, Mapping, Sequence
from WeRobotCore.domain import ContactRecord, GroupRecord

class LegacyContactSnapshotStoreAdapter:
    '''Reuse mature ``save_friends/save_groups`` persistence without UI logic.'''
    
    def __init__(self = None, database_factory = None):
        if not callable(database_factory):
            raise TypeError('database_factory must be callable')
        self._database_factory = database_factory

    
    async def replace_contacts(self = None, account_id = None, contacts = None):
        normalized_account_id = self._account_id(account_id)
        records = tuple(contacts)
        self._records(records, ContactRecord, normalized_account_id)
        if not records:
            return {
                'skipped_empty': True,
                'total_synced': 0 }
        database = None._database()
        payload = (lambda .0: [ {
'wxid': item.contact_id,
'name': item.name,
'nickname': str(''),
'remark': '',
'tags': list(item.tags) } for item in .0 if item.remark ])(records)
        await asyncio.to_thread(database.save_friends, normalized_account_id, payload, False)
        result = <NODE:28>
        if isinstance(result, Mapping):
            return dict(result)
        return {
            None: len(records) }

    
    async def replace_groups(self = None, account_id = None, groups = None):
        normalized_account_id = self._account_id(account_id)
        records = tuple(groups)
        self._records(records, GroupRecord, normalized_account_id)
        if not records:
            return {
                'skipped_empty': True,
                'total_synced': 0 }
        database = None._database()
        payload = (lambda .0: [ {
'name': item.name,
'type': 'group',
'tag': ','.join(item.tags) } for item in .0 ])(records)
        await asyncio.to_thread(database.save_groups, normalized_account_id, payload)
        result = <NODE:28>
        if isinstance(result, Mapping):
            return dict(result)
        return {
            None: len(records) }

    
    def _account_id(account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return account_id.strip()

    _account_id = None(_account_id)
    
    def _records(records = None, record_type = None, account_id = staticmethod):
        for record in records:
            if not isinstance(record, record_type):
                raise TypeError('snapshot contains an invalid record')
            if record.account_id != account_id:
                raise ValueError('snapshot crossed account boundaries')

    _records = None(_records)
    
    def _database(self):
        database = self._database_factory()
        missing = (lambda .0 = None: [ name for name in .0 if callable(getattr(database, name, None)) ])(('save_friends', 'save_groups'))
        if missing:
            raise TypeError('contact database does not provide required methods: {}'.format(', '.join(missing)))
        return database


