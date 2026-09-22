# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: explicit_path.marshal (Python 3.9)

'''Explicit-root adapter for the established JSON chat-history contract.'''
from __future__ import annotations
import asyncio
from pathlib import Path
from typing import Dict
from WeRobotCore.application.auto_reply import AutoReplyTaskHistoryStore, AutoReplyTaskHistoryStoreFactory, require_task_history_store
from WeRobotCore.utils.chat_history import ChatHistoryManager

def _account_segment(account_id = None):
    if not isinstance(account_id, str) or account_id:
        raise ValueError('account_id must be a non-empty string')
    if len(account_id.encode('utf-8')) > 255:
        raise ValueError('account_id exceeds the filesystem segment limit')
    if account_id in ('.', '..') or Path(account_id).name != account_id:
        raise ValueError('account_id must be one safe filesystem segment')
    if '\x00' in account_id:
        raise ValueError('account_id must not contain NUL')
    return account_id


class ExplicitPathChatHistoryStore(ChatHistoryManager):
    '''Reuse mature history behavior without DataManager or ``Path.home``.

    Construction and reads of missing history are side-effect free.  The
    account directory and established ``sessions_index.json`` are created only
    by the first write, matching the point where persistence is actually
    required.
    '''
    
    def __new__(cls, *args, **kwargs):
        return object.__new__(cls)

    
    def __init__(self = None, *, history_root, account_id):
        if not isinstance(history_root, Path):
            raise TypeError('history_root must be a pathlib.Path')
        if not history_root.is_absolute():
            raise ValueError('history_root must be an absolute path')
        normalized_account_id = _account_segment(account_id)
        self.account_id = normalized_account_id
        self._history_dir = str(history_root / normalized_account_id)
        self._sessions_index_path = str(history_root / normalized_account_id / 'sessions_index.json')
        self._max_messages = 100
        self._lock = asyncio.Lock()
        self._initialized = True

    
    def _ensure_write_root(self = None):
        directory = Path(self._history_dir)
        directory.mkdir(True, True, **('parents', 'exist_ok'))
        if not Path(self._sessions_index_path).exists():
            self._init_sessions_index()

    
    async def save_messages(self = None, session_id = None, session_name = None, messages = None, is_group = None):
        self._ensure_write_root()
        await super().save_messages(session_id, session_name, messages, is_group)

    __classcell__ = None


class ExplicitPathChatHistoryStoreFactory:
    '''Per-account store cache bound to one explicit product data root.'''
    
    def __init__(self = None, *, history_root):
        if not isinstance(history_root, Path):
            raise TypeError('history_root must be a pathlib.Path')
        if not history_root.is_absolute():
            raise ValueError('history_root must be an absolute path')
        self._history_root = history_root
        self._stores = { }

    
    def history_root(self = None):
        return self._history_root

    history_root = None(history_root)
    
    def __call__(self = None, account_id = None):
        return self.for_account(account_id)

    
    def for_account(self = None, account_id = None):
        normalized_account_id = _account_segment(account_id)
        store = self._stores.get(normalized_account_id)
        if store is None:
            store = ExplicitPathChatHistoryStore(self._history_root, normalized_account_id, **('history_root', 'account_id'))
            self._stores[normalized_account_id] = store
        return require_task_history_store(store)


__all__ = [
    'ExplicitPathChatHistoryStore',
    'ExplicitPathChatHistoryStoreFactory']
