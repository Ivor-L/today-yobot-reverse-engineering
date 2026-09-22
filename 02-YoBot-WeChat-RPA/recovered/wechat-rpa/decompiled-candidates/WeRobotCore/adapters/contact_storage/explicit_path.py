# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: explicit_path.marshal (Python 3.9)

'''Explicit-path SQLite storage for normalized macOS contact snapshots.

The schema intentionally preserves the mature ``friends`` and ``groups``
columns consumed by AutoReply matching.  Unlike ``WeChatDBManager``, this
adapter never consults ``DataManager`` and construction performs no I/O.
'''
from __future__ import annotations
import asyncio
from contextlib import closing
from datetime import datetime
from pathlib import Path
import sqlite3
from typing import Any, Mapping, Sequence, Tuple
from WeRobotCore.domain import ContactRecord, GroupRecord

class ExplicitPathContactStore:
    '''Full-snapshot Store and read-only AutoReply contact facts.'''
    
    def __init__(self = None, database_path = None):
        if not isinstance(database_path, Path):
            raise TypeError('database_path must be a pathlib.Path')
        if not database_path.is_absolute():
            raise ValueError('database_path must be absolute')
        if database_path.name in ('', '.', '..'):
            raise ValueError('database_path must identify a file')
        self._database_path = database_path

    
    def database_path(self = None):
        return self._database_path

    database_path = None(database_path)
    
    def _account_id(account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return account_id.strip()

    _account_id = None(_account_id)
    
    def _records(account_id = None, records = None, record_type = staticmethod):
        if not isinstance(records, (str, bytes)) or isinstance(records, Sequence):
            raise TypeError('snapshot records must be a sequence')
        normalized = tuple(records)
        for record in normalized:
            if not isinstance(record, record_type):
                raise TypeError('snapshot contains an invalid record')
            if record.account_id != account_id:
                raise ValueError('snapshot crossed account boundaries')
        return normalized

    _records = None(_records)
    
    def _readable_database(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _connect_read_only(self = None):
        if not self._readable_database():
            raise FileNotFoundError(str(self._database_path))
        connection = sqlite3.connect('{}?mode=ro'.format(self._database_path.as_uri()), True, 5, **('uri', 'timeout'))
        connection.execute('PRAGMA query_only = ON')
        connection.execute('PRAGMA busy_timeout = 5000')
        return connection

    
    def _connect_for_write(self = None):
        parent = self._database_path.parent
        parent.mkdir(True, True, **('parents', 'exist_ok'))
        if self._database_path.exists() and self._database_path.is_symlink():
            raise ValueError('contact database must not be a symbolic link')
        connection = sqlite3.connect(str(self._database_path), 30, **('timeout',))
        connection.execute('PRAGMA foreign_keys = ON')
        connection.execute('PRAGMA busy_timeout = 30000')
        self._ensure_schema(connection)
        return connection

    
    def _ensure_schema(connection = None):
        connection.execute('\n            CREATE TABLE IF NOT EXISTS friends (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                account_id TEXT NOT NULL,\n                wxid TEXT NOT NULL,\n                name TEXT NOT NULL,\n                nickname TEXT,\n                remark TEXT,\n                tag TEXT,\n                is_new INTEGER DEFAULT 0,\n                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n                last_updated DATETIME,\n                UNIQUE(account_id, wxid, tag)\n            )\n            ')
        connection.execute("\n            CREATE TABLE IF NOT EXISTS groups (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                account_id TEXT NOT NULL,\n                name TEXT NOT NULL,\n                tag TEXT DEFAULT '',\n                last_updated DATETIME,\n                UNIQUE(account_id, name)\n            )\n            ")

    _ensure_schema = None(_ensure_schema)
    
    def _tag_text(tags = None):
        return ','.join(sorted((lambda .0: pass# WARNING: Decompyle incomplete
)(tags)))

    _tag_text = None(_tag_text)
    
    def _replace_contacts_sync(self = None, account_id = None, contacts = None):
        connection = self._connect_for_write()
    # WARNING: Decompyle incomplete

    
    def _replace_groups_sync(self = None, account_id = None, groups = None):
        connection = self._connect_for_write()
    # WARNING: Decompyle incomplete

    
    async def replace_contacts(self = None, account_id = None, contacts = None):
        normalized_account = self._account_id(account_id)
        snapshot = self._records(normalized_account, contacts, ContactRecord)
        if not snapshot:
            return {
                'skipped_empty': True,
                'total_synced': 0 }
        await None.to_thread(self._replace_contacts_sync, normalized_account, snapshot)
        return <NODE:28>

    
    def _upsert_contact_sync(self = None, account_id = None, contact = None):
        '''Persist one chat-discovered contact with Windows-compatible state.'''
        connection = self._connect_for_write()
    # WARNING: Decompyle incomplete

    
    async def upsert_contact(self = None, account_id = None, contact = None):
        '''Write only one verified contact from the active private chat.'''
        normalized_account = self._account_id(account_id)
        if not isinstance(contact, ContactRecord):
            raise TypeError('contact must be a ContactRecord')
        if contact.account_id != normalized_account:
            raise ValueError('contact crossed account boundaries')
        await asyncio.to_thread(self._upsert_contact_sync, normalized_account, contact)
        return <NODE:28>

    
    async def replace_groups(self = None, account_id = None, groups = None):
        normalized_account = self._account_id(account_id)
        snapshot = self._records(normalized_account, groups, GroupRecord)
        if not snapshot:
            return {
                'skipped_empty': True,
                'total_synced': 0 }
        await None.to_thread(self._replace_groups_sync, normalized_account, snapshot)
        return <NODE:28>

    
    def _list_contacts_sync(self = None, account_id = None, tag = None, keyword = {
        'account_id': 'str',
        'tag': 'str',
        'keyword': 'str',
        'return': 'Tuple[Mapping[str, Any], ...]' }):
        if not self._readable_database():
            return ()
        with None(self._connect_read_only()) as connection:
            rows = connection.execute('\n                SELECT wxid, name, tag, is_new, last_updated\n                FROM friends\n                WHERE account_id = ?\n                ORDER BY name COLLATE NOCASE, wxid\n                ', (account_id,)).fetchall()
            None(None, None, None)
        with None:
            if not None:
                pass
        result = []
        normalized_keyword = keyword.casefold()
        for wxid, name, tag_text, is_new, last_updated in rows:
            if not name:
                pass
            normalized_name = str('').strip()
            if not normalized_name:
                continue
            if not tag_text:
                pass
            tags = tuple((lambda .0: 