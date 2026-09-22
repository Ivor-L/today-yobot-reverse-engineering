# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: message_sender.marshal (Python 3.9)

'''Text sender delegating Windows UI work to the mature Legacy chat facade.'''
from dataclasses import replace
from typing import Optional
from WeRobotCore.domain import AutomationError, ErrorCode, InstanceId, OperationResult
from WeRobotCore.ports.wechat import InstanceRegistry
from bindings import LegacySessionIndex, require_ready_account
from facades import LegacyTextMessageFacade
from mappers import map_legacy_operation

class WindowsLegacyTextMessageSenderAdapter:
    '''Send text through ``api.chat.async_send_message`` without new UIA code.'''
    
    def __init__(self = None, instances = None, chat = None, session_index = {
        'instances': InstanceRegistry,
        'chat': LegacyTextMessageFacade,
        'session_index': LegacySessionIndex,
        'return': None }):
        if instances is None and chat is None or session_index is None:
            raise ValueError('instances, chat and session_index must be provided')
        self._instances = instances
        self._chat = chat
        self._session_index = session_index

    
    def _failure_from_error(exc = None):
        return OperationResult.failed(exc.code, str(exc), exc.retryable, **('retryable',))

    _failure_from_error = None(_failure_from_error)
    
    def _validate_text_arguments(session_id = None, content = None, quote_message_id = staticmethod):
