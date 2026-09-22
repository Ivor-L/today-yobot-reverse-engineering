# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_chat.marshal (Python 3.9)

'''Legacy UI chat routes over the normalized macOS product runtime.

The signed W1 IDE candidate and production Agent plugin install this shared
adapter. It keeps the established Vue request/response shapes while all native
behavior remains behind ``WeChatAutomationGateway`` and the Mac Driver.
'''
from __future__ import annotations
import hmac
from typing import Any, Dict, Mapping, Optional, Sequence, Tuple
from fastapi import APIRouter, HTTPException, Query, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.application.auto_reply import map_conversation_to_auto_reply_input
from WeRobotCore.application.instances.inventory import InstanceInventorySource
from WeRobotCore.application.runtime import AutomationContext, WeChatAutomationGateway
from WeRobotCore.application.session_time import session_recency_timestamp
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from WeRobotCore.domain import AccountInstance, AutomationError, ChatType, SessionSummary
from macos_process import MacOSControlProcessRuntime
MACOS_MVP_LATEST_SESSIONS_PATH = '/api/chat/latest_sessions'
MACOS_MVP_MESSAGES_PATH = '/api/chat/messages/{session_name}'
MACOS_MVP_SEND_MESSAGE_PATH = '/api/chat/send_message'
MACOS_MVP_SUSPENDED_SESSIONS_PATH = '/api/chat/suspended_sessions'
MACOS_MVP_SUSPENDED_COUNT_PATH = '/api/chat/suspended_count'
MACOS_MVP_UNSUSPEND_SESSION_PATH = '/api/chat/unsuspend_session'
MACOS_MVP_HISTORY_SESSIONS_PATH = '/api/chat/history_sessions'
MACOS_MVP_HISTORY_MESSAGES_PATH = '/api/chat/history_messages/{session_id}'
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_chat_installed'

class MacOSMvpSendMessageRequest(BaseModel):
    message: 'str' = ConfigDict(True, 'forbid', **('populate_by_name', 'extra'))
    quote_message_id: 'Optional[str]' = Field(None, 'quote_msg_id', **('alias',))
    account_id: 'Optional[str]' = Field(None, 'accountId', **('alias',))


class MacOSMvpUnsuspendSessionRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    session_name: 'str' = Field(1, **('min_length',))
    account_id: 'str' = Field(1, **('min_length',))


def _error(status_code = None, code = None, message = None):
    return HTTPException(status_code, {
        'code': code,
        'message': message }, **('status_code', 'detail'))


async def _account_context(gateway = None, requested_account_id = None):
    await gateway.runtime.instances.list_attached()
    attached = tuple(<NODE:28>)
    complete = tuple((lambda .0: 