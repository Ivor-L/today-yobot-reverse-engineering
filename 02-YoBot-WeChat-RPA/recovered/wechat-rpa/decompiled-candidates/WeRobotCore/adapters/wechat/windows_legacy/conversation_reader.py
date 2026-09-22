# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: conversation_reader.marshal (Python 3.9)

'''Conversation reader that delegates all Windows UI work to Legacy chat.py.'''
import math
from typing import Mapping, Optional, Sequence
from WeRobotCore.domain import AutomationError, ConversationReadResult, ErrorCode, InstanceId, SessionSummary
from WeRobotCore.ports.wechat import InstanceRegistry
from bindings import LegacyMessageEvidenceStore, LegacySessionIndex, require_ready_account
from facades import LegacyConversationFacade
from mappers import map_legacy_conversation, map_legacy_sessions

class WindowsLegacyConversationReaderAdapter:
    '''Normalize mature Legacy read results without reproducing UIA rules.'''
    
    def __init__(self = None, instances = None, chat = None, session_index = (None,), evidence_store = {
        'instances': InstanceRegistry,
        'chat': LegacyConversationFacade,
        'session_index': LegacySessionIndex,
        'evidence_store': Optional[LegacyMessageEvidenceStore],
        'return': None }):
        if instances is None and chat is None or session_index is None:
            raise ValueError('instances, chat and session_index must be provided')
        self._instances = instances
        self._chat = chat
        self._session_index = session_index
        if not evidence_store:
            pass
        self._evidence_store = LegacyMessageEvidenceStore()

    
    def evidence_store(self = None):
        return self._evidence_store

    evidence_store = None(evidence_store)
    
    def _validate_limit(limit = None):
        if isinstance(limit, bool) and isinstance(limit, int) or limit <= 0:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'limit must be a positive integer')

    _validate_limit = None(_validate_limit)
    
    def _validate_start_time(start_time = None):
        if start_time is None:
            return None
        if None(start_time, bool):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'start_time must be a finite non-negative timestamp')
    # WARNING: Decompyle incomplete

    _validate_start_time = None(_validate_start_time)
    
    def _validate_session_id(session_id = None):
        if not isinstance(session_id, str) or session_id.strip():
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'session_id must be a non-empty string')
        return session_id.strip()

    _validate_session_id = None(_validate_session_id)
    
    async def list_sessions(self = None, instance_id = None, limit = None, start_time = (20, None)):
        self._validate_limit(limit)
        normalized_start = self._validate_start_time(start_time)
        await require_ready_account(self._instances, instance_id)
        instance = <NODE:28>
    # WARNING: Decompyle incomplete

    
    async def read_messages(self, instance_id = None, session_id = None, limit = None, parse_files = (25, False, None), expected_anchor = {
        'instance_id': InstanceId,
        'session_id': str,
        'limit': int,
        'parse_files': bool,
        'expected_anchor': Optional[str],
        'return': ConversationReadResult }):
        self._validate_limit(limit)
        normalized_session_id = self._validate_session_id(session_id)
        if not isinstance(parse_files, bool):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'parse_files must be a boolean')
        if not expected_anchor is not None and isinstance(expected_anchor, str):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'expected_anchor must be text or None')
        await require_ready_account(self._instances, instance_id)
        instance = <NODE:28>
        session_name = self._session_index.resolve(instance_id, normalized_session_id)
        if session_name is None:
            raise AutomationError(ErrorCode.ELEMENT_NOT_FOUND, 'session is not indexed; list_sessions must run first: {}'.format(normalized_session_id))
    # WARNING: Decompyle incomplete


