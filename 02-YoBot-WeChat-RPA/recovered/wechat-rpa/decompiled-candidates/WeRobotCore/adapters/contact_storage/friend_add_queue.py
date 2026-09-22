# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: friend_add_queue.marshal (Python 3.9)

'''Explicit-path SQLite queue for automatic friend-add targets on macOS.'''
from __future__ import annotations
import asyncio
from contextlib import closing
from datetime import date, datetime, timedelta, timezone
import json
from pathlib import Path
import sqlite3
from typing import Any, Mapping, Sequence, Tuple
from WeRobotCore.application.add_friend import AddFriendResult
_QUEUE_STATUSES = frozenset(('pending', 'added', 'already', 'unknown', 'frequent_risk', 'failed'))

class ExplicitPathFriendAddStore:
    '''Own the friend-add queue without consulting the legacy DataManager.'''
    
    def __init__(self = None, database_path = None):
        if not isinstance(database_path, Path):
            raise TypeError('database_path must be a pathlib.Path')
        if database_path.is_absolute() or database_path.name in ('', '.', '..'):
            raise ValueError('database_path must identify an absolute file')
        self._database_path = database_path

    
    def database_path(self = None):
        return self._database_path

    database_path = None(database_path)
    
    def _connect(self = None):
        self._database_path.parent.mkdir(True, True, **('parents', 'exist_ok'))
        if self._database_path.exists() and self._database_path.is_symlink():
            raise ValueError('friend-add database must not be a symbolic link')
        connection = sqlite3.connect(str(self._database_path), 30, **('timeout',))
        connection.row_factory = sqlite3.Row
        connection.execute('PRAGMA busy_timeout = 30000')
        self._ensure_schema(connection)
        return connection

    
    def _ensure_schema(connection = None):
        connection.execute("\n            CREATE TABLE IF NOT EXISTS friend_add_queue (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                wxid TEXT NOT NULL UNIQUE,\n                remark TEXT NOT NULL DEFAULT '',\n                tags TEXT NOT NULL DEFAULT '',\n                nickname TEXT NOT NULL DEFAULT '',\n                status TEXT NOT NULL DEFAULT 'pending',\n                error TEXT NOT NULL DEFAULT '',\n                account_id TEXT,\n                created_at TEXT NOT NULL,\n                updated_at TEXT NOT NULL\n            )\n            ")
        connection.execute("\n            CREATE TABLE IF NOT EXISTS friend_add_runs (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                task_id TEXT NOT NULL UNIQUE,\n                account_id TEXT NOT NULL,\n                processed_count INTEGER NOT NULL DEFAULT 0,\n                attempt_count INTEGER NOT NULL DEFAULT 0,\n                verify_message TEXT NOT NULL DEFAULT '',\n                targets_json TEXT NOT NULL DEFAULT '[]',\n                created_at TEXT NOT NULL\n            )\n            ")
        connection.execute('\n            CREATE TABLE IF NOT EXISTS friend_add_daily_counts (\n                account_id TEXT NOT NULL,\n                local_day TEXT NOT NULL,\n                added_count INTEGER NOT NULL DEFAULT 0,\n                updated_at TEXT NOT NULL,\n                PRIMARY KEY (account_id, local_day)\n            )\n            ')
        connection.execute("\n            CREATE TABLE IF NOT EXISTS friend_add_risks (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                account_id TEXT NOT NULL,\n                risk_type TEXT NOT NULL,\n                detail TEXT NOT NULL DEFAULT '',\n                created_at TEXT NOT NULL\n            )\n            ")

    _ensure_schema = None(_ensure_schema)
    
    def _text(name = None, value = None, *, required):
        if not value is None and required:
            return ''
        if not None(value, str):
            raise TypeError('{} must be text'.format(name))
        normalized = value.strip()
        if not required and normalized:
            raise ValueError('{} must be non-empty text'.format(name))
        return normalized

    _text = None(_text)
    
    def _tag_text(value = None):
