# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: contact_database.marshal (Python 3.9)

'''Read-only bridge over the existing Windows contact database snapshots.'''
from typing import Any, Callable, Mapping, Sequence
from facades import LegacyContactDatabase

class WindowsLegacyContactDatabaseFacade:
    """Expose Legacy ``get_friends/get_groups`` rows as mapping snapshots.

    The current API already lists contacts from the shared SQLite database.
    This bridge retains that read-only behaviour and intentionally does not
    call ``sync_contacts``, ``sync_groups`` or any UI Automation method.
    It preserves ``is_new`` and timestamp facts but does not reproduce the
    current UI's seven-day/filter decisions; those remain shared business
    formatting above the Driver boundary.
    ``database_factory`` is evaluated only when a list method is invoked so
    composing a Runtime remains side-effect free.
    """
    
    def __init__(self = None, database_factory = None):
        if not callable(database_factory):
            raise ValueError('database_factory must be callable')
        self._database_factory = database_factory

    
    def _account_id(account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return account_id.strip()

    _account_id = None(_account_id)
    
    def _rows(raw = None, operation = None):
        if isinstance(raw, Sequence) or isinstance(raw, (str, bytes, Mapping)):
            raise TypeError('{} returned a non-sequence result'.format(operation))
        return raw

    _rows = None(_rows)
    
    def _contact_row(row = None):
        if isinstance(row, Mapping):
            return dict(row)
        if None(row, Sequence) or isinstance(row, (str, bytes)):
            raise TypeError('Legacy contact row must be a mapping or sequence')
        if len(row) < 2:
            raise ValueError('Legacy contact row must contain wxid and name')
        values = tuple(row) + (None,) * max(0, 8 - len(row))
        (wxid, name, nickname, remark, tag, is_new, last_updated, created_at) = values[:8]
        if not is_new is True:
            pass
        return {
            'wxid': wxid,
            'name': name,
            'nickname': nickname,
            'remark': remark,
            'tag': tag,
            'is_new': is_new == 1,
            'last_updated': last_updated,
            'created_at': created_at }

    _contact_row = None(_contact_row)
    
    def _group_row(row = None):
        if isinstance(row, Mapping):
            return dict(row)
        if None(row, Sequence) or isinstance(row, (str, bytes)):
            raise TypeError('Legacy group row must be a mapping or sequence')
        if len(row) < 1:
            raise ValueError('Legacy group row must contain a name')
        values = tuple(row) + (None,) * max(0, 3 - len(row))
        (name, tag, last_updated) = values[:3]
        return {
            'name': name,
            'tag': tag,
            'last_updated': last_updated }

    _group_row = None(_group_row)
    
    def _database(self = None):
        database = self._database_factory()
        missing = (lambda .0 = None: [ method_name for method_name in .0 if callable(getattr(database, method_name, None)) ])(('get_friends', 'get_groups'))
        if missing:
            raise TypeError('contact database does not provide required methods: {}'.format(', '.join(missing)))
        return database

    
    async def async_list_contacts(self = None, account_id = None):
        normalized_account_id = self._account_id(account_id)
        rows = self._rows(self._database().get_friends(normalized_account_id), 'get_friends')
        return None((lambda .0 = None: for row in .0:
self._contact_row(row))(rows))

    
    async def async_list_groups(self = None, account_id = None):
        normalized_account_id = self._account_id(account_id)
        rows = self._rows(self._database().get_groups(normalized_account_id), 'get_groups')
        return None((lambda .0 = None: for row in .0:
self._group_row(row))(rows))


