# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: conversation_reader.marshal (Python 3.9)

'''Context-backed reader for the established auto-reply business input.'''
from typing import Any, Callable, Dict, Mapping, Optional, Protocol, runtime_checkable
from WeRobotCore.application.runtime import AutomationContext
from WeRobotCore.domain import MessageRecord
from conversation_input import map_conversation_to_auto_reply_input
AutomationContextProvider = runtime_checkable(<NODE:12>)
AutoReplyConversationInputReader = runtime_checkable(<NODE:12>)
ContextMessageEvidenceResolver = Callable[([
    AutomationContext,
    MessageRecord], Optional[Mapping[(str, Any)]])]

class AutomationContextAutoReplyConversationInputReader:
    '''Use an account context, then restore the mature business dictionary.'''
    
    def __init__(self = None, contexts = None, evidence_resolver = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        if not evidence_resolver is not None and callable(evidence_resolver):
            raise TypeError('evidence_resolver must be callable or None')
        self._contexts = contexts
        self._evidence_resolver = evidence_resolver

    
    async def read_conversation_input(self, account_id = None, session_id = None, limit = None, parse_files = (15, True, None), expected_anchor = {
        'account_id': str,
        'session_id': str,
        'limit': int,
        'parse_files': bool,
        'expected_anchor': Optional[str],
        'return': Dict[(str, Any)] }):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        if not isinstance(session_id, str) or session_id.strip():
            raise ValueError('session_id must be a non-empty string')
        if isinstance(limit, bool) and isinstance(limit, int) or limit <= 0:
            raise ValueError('limit must be a positive integer')
        if not isinstance(parse_files, bool):
            raise TypeError('parse_files must be a boolean')
        if not expected_anchor is not None and isinstance(expected_anchor, str):
            raise TypeError('expected_anchor must be text or None')
        await self._contexts.for_account(account_id.strip())
        context = <NODE:28>
        await context.read_messages(session_id.strip(), limit, parse_files, expected_anchor, **('limit', 'parse_files', 'expected_anchor'))
        conversation = <NODE:28>
        resolver = None
        if self._evidence_resolver is not None:
            
            resolver = lambda message = None: self._evidence_resolver(context, message)
        return map_conversation_to_auto_reply_input(conversation, resolver, **('evidence_resolver',))


