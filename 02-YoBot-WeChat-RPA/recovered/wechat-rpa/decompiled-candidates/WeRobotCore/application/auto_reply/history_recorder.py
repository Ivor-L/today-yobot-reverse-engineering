# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: history_recorder.marshal (Python 3.9)

'''Platform-neutral reply-history refresh built from Context plus shared storage.'''
from typing import Any, List, Mapping, Protocol, runtime_checkable
from conversation_input import map_conversation_to_auto_reply_input
from conversation_reader import AutomationContextProvider
AutoReplyHistoryStore = runtime_checkable(<NODE:12>)
AutoReplyHistoryRecorder = runtime_checkable(<NODE:12>)

class AutomationContextAutoReplyHistoryRecorder:
    '''Read through a Driver Context and write through the shared history store.'''
    
    def __init__(self = None, contexts = None, history_store_factory = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        if not callable(history_store_factory):
            raise TypeError('history_store_factory must be callable')
        self._contexts = contexts
        self._history_store_factory = history_store_factory

    
    async def record_after_reply(self, account_id = None, session_id = None, session_name = None, limit = (15, True), parse_files = {
        'account_id': str,
        'session_id': str,
        'session_name': str,
        'limit': int,
        'parse_files': bool,
        'return': None }):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        if not isinstance(session_id, str) or session_id.strip():
            raise ValueError('session_id must be a non-empty string')
        if not isinstance(session_name, str) or session_name.strip():
            raise ValueError('session_name must be a non-empty string')
        if isinstance(limit, bool) and isinstance(limit, int) or limit <= 0:
            raise ValueError('limit must be a positive integer')
        if not isinstance(parse_files, bool):
            raise TypeError('parse_files must be a boolean')
        normalized_account_id = account_id.strip()
        normalized_session_id = session_id.strip()
        normalized_session_name = session_name.strip()
        await self._contexts.for_account(normalized_account_id)
        context = <NODE:28>
        await context.read_messages(normalized_session_id, limit, parse_files, None, **('limit', 'parse_files', 'expected_anchor'))
        conversation = <NODE:28>
        history_input = map_conversation_to_auto_reply_input(conversation)
        store = self._history_store_factory(normalized_account_id)
        if not store is None or isinstance(store, AutoReplyHistoryStore):
            raise TypeError('history_store_factory must return AutoReplyHistoryStore')
        await store.save_messages(normalized_session_name, normalized_session_name, history_input['messages'], history_input['chatType'] == 'group')


