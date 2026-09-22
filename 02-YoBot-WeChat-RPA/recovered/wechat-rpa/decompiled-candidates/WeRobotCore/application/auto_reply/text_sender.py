# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: text_sender.marshal (Python 3.9)

'''Context-backed text delivery for the shared auto-reply workflow.'''
from typing import Optional, Protocol, runtime_checkable
from WeRobotCore.domain import OperationResult
from conversation_reader import AutomationContextProvider
AutoReplyTextSender = runtime_checkable(<NODE:12>)

class AutomationContextAutoReplyTextSender:
    '''Resolve the account Context and delegate one text write to its Driver.'''
    
    def __init__(self = None, contexts = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        self._contexts = contexts

    
    async def send_text(self = None, account_id = None, session_id = None, content = (None,), quote_message_id = {
        'account_id': str,
        'session_id': str,
        'content': str,
        'quote_message_id': Optional[str],
        'return': OperationResult }):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        if not isinstance(session_id, str) or session_id.strip():
            raise ValueError('session_id must be a non-empty string')
        if not isinstance(content, str) or content.strip():
            raise ValueError('content must be non-empty text')
        if quote_message_id is not None:
            if not isinstance(quote_message_id, str) or quote_message_id.strip():
                raise ValueError('quote_message_id must be non-empty text or None')
        await self._contexts.for_account(account_id.strip())
        context = <NODE:28>
        await context.send_text(session_id.strip(), content, quote_message_id, **('quote_message_id',))
        result = <NODE:28>
        if not isinstance(result, OperationResult):
            raise TypeError('AutomationContext.send_text must return OperationResult')
        return result


