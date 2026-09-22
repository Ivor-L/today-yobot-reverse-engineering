# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS Driver adapter for the shared automatic follow-up workflow.'''
from __future__ import annotations
import json
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional
from WeRobotCore.adapters.contact_storage import ExplicitPathContactStore
from WeRobotCore.adapters.mass_sending import MacOSMassSendingRuntime
from WeRobotCore.application.auto_follow import AutoFollowRuntime
from WeRobotCore.application.auto_reply import AutoReplyConversationInputReader, AutoReplyHistoryRecorder, AutoReplyTaskHistoryStoreFactory, GreetingMessageSender
from WeRobotCore.domain import CapabilityName, ChatType, SessionSummary

class MacOSAutoFollowRuntime(AutoFollowRuntime):
    '''Compose explicit Mac storage with already-audited outbound Driver ports.'''
    
    def __init__(self = None, *, outbound_runtime, contact_store, conversation_reader, history_recorder, history_factory, auto_reply_manager, file_library_root):
        if not isinstance(outbound_runtime, MacOSMassSendingRuntime):
            raise TypeError('outbound_runtime must be MacOSMassSendingRuntime')
        if not isinstance(contact_store, ExplicitPathContactStore):
            raise TypeError('contact_store must be ExplicitPathContactStore')
        if not isinstance(conversation_reader, AutoReplyConversationInputReader):
            raise TypeError('conversation_reader must implement AutoReplyConversationInputReader')
        if not isinstance(history_recorder, AutoReplyHistoryRecorder):
            raise TypeError('history_recorder must implement AutoReplyHistoryRecorder')
        if not isinstance(history_factory, AutoReplyTaskHistoryStoreFactory):
            raise TypeError('history_factory must implement AutoReplyTaskHistoryStoreFactory')
        if not callable(getattr(auto_reply_manager, 'cache_mass_sending_message', None)):
            raise TypeError('auto_reply_manager must expose cache_mass_sending_message()')
        if not isinstance(file_library_root, Path) or file_library_root.is_absolute():
            raise ValueError('file_library_root must be an absolute pathlib.Path')
        self._outbound = outbound_runtime
        self._contacts = contact_store
        self._reader = conversation_reader
        self._history_recorder = history_recorder
        self._history_factory = history_factory
        self._auto_reply_manager = auto_reply_manager
        self._file_library_root = file_library_root

    
    def message_sender(self = None):
        return self._outbound.message_sender

    message_sender = None(message_sender)
    
    def configuration_for(self = None, account_id = None):
        return self._outbound.configuration_for(account_id)

    
    async def validate_target(self = None, account_id = None, target_name = None, chat_type = {
        'account_id': 'str',
        'target_name': 'str',
        'chat_type': 'str',
        'return': 'None' }):
        if not account_id:
            pass
        account = str('').strip()
        if not target_name:
            pass
        name = str('').strip()
        if not chat_type:
            pass
        kind = str('single').strip().lower()
        if not account or name:
            raise ValueError('自动跟单必须明确指定账号和目标')
        if kind not in ('single', 'group'):
            raise ValueError('chat_type 必须是 single 或 group')
        is_group = self._contacts.is_group_chat(account, name)
        if kind == 'group':
            if not is_group:
                raise ValueError('目标不在已同步的群聊目录中: {}'.format(name))
            return None
        if None:
            raise ValueError('单聊目标与已同步群聊重名: {}'.format(name))
        await self._contacts.list_contacts(account, name, **('keyword',))
        exact = (lambda .0 = None: [ item for item in .0 if str('').strip() == name ])(<NODE:28>)
        if len(exact) != 1:
            raise ValueError('目标不在已同步的好友目录中: {}'.format(name))

    
    async def resolve_conversation(self = None, account_id = None, target_name = None, chat_type = {
        'account_id': 'str',
        'target_name': 'str',
        'chat_type': 'str',
        'return': 'SessionSummary' }):
        await self.validate_target(account_id, target_name, chat_type)
        expected = ChatType.GROUP if chat_type == 'group' else ChatType.PRIVATE
        await self._outbound.resolve_conversation_as(account_id, target_name, expected, CapabilityName.CONTACT_AUTO_FOLLOW.value, **('required_capability',))
        return <NODE:28>

    
    async def load_history(self = None, account_id = None, session_name = None, limit = {
        'account_id': 'str',
        'session_name': 'str',
        'limit': 'int',
        'return': 'List[Dict[str, Any]]' }):
        store = self._history_factory.for_account(account_id)
        loader = getattr(store, 'load_history', None)
        if not callable(loader):
            return []
        await None(session_name)
        history = <NODE:28>
        normalized = []
        if not history:
            pass
        for message in list([])[-limit:]:
            item = dict(message)
            sender = item.get('sender')
            if not isinstance(sender, Mapping):
                item['sender'] = {
                    'name': item.get('sender_name', '') }
            normalized.append(item)
        return normalized

    
    async def read_current_messages(self = None, account_id = None, session_id = None, limit = {
        'account_id': 'str',
        'session_id': 'str',
        'limit': 'int',
        'return': 'List[Dict[str, Any]]' }):
        await self._reader.read_conversation_input(account_id, session_id, limit, True, None, **('limit', 'parse_files', 'expected_anchor'))
        value = <NODE:28>
        return (lambda .0: [ dict(item) for item in .0 ])(value.get('messages', []))

    
    async def record_after_reply(self = None, account_id = None, session_id = None, session_name = {
        'account_id': 'str',
        'session_id': 'str',
        'session_name': 'str',
        'return': 'None' }):
        await self._history_recorder.record_after_reply(account_id, session_id, session_name, 15, True, **('limit', 'parse_files'))

    
    async def cache_outgoing(self = None, session_name = None, content = None):
        await self._auto_reply_manager.cache_mass_sending_message(session_name, content)

    
    def resolve_local_file(self = None, key = None):
        if not key:
            pass
        normalized = str('').strip()
        if not normalized:
            return None
        index_path = None._file_library_root / 'index.json'
    # WARNING: Decompyle incomplete

    
    async def is_account_online(self = None, account_id = None):
        await self._outbound.is_account_online(account_id)
        return <NODE:28>


__all__ = [
    'MacOSAutoFollowRuntime']
