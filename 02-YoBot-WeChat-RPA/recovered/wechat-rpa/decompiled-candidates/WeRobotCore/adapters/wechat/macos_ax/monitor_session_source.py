# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: monitor_session_source.marshal (Python 3.9)

'''Monitor input adapter backed by one macOS Driver session scan.'''
import logging
import re
import time
from dataclasses import replace
from datetime import datetime
from typing import Callable, Optional
from WeRobotCore.application.monitoring import MonitorSessionBatch, MonitorSessionItem
from WeRobotCore.application.session_time import parse_wechat_session_time, session_recency_timestamp
from WeRobotCore.domain import AutomationError, ChatType, ErrorCode, InstanceState, MentionState, SessionSummary
from driver import MacOSAxDriver
GroupChatLookup = Callable[([
    str,
    str], bool)]
logger = logging.getLogger(__name__)
_WINDOWS_RECENT_SESSION_SECONDS = 300
_TODAY_MINUTE_LABEL = re.compile('^(?:(?:今天|凌晨|早上|上午|中午|下午|傍晚|晚上)\\s+){0,2}\\d{1,2}:\\d{2}$')

def _session_event_timestamp(session = None, now = None):
    text = ' '.join(session.last_event_text.strip().split())
    parsed = parse_wechat_session_time(text, now, **('now',))
    if parsed is not None:
        if parsed.date() == now.date() and _TODAY_MINUTE_LABEL.fullmatch(text):
            return parsed.replace(59, 0, **('second', 'microsecond')).timestamp()
        return None.timestamp()
    if None.last_event_at is not None:
        return session.last_event_at.timestamp()


def _compatibility_payload(summary = None):
    '''Project Mac facts into the existing monitor/task compatibility shape.'''
    payload = {
        'id': summary.session_id,
        'name': summary.name,
        'lastMessage': summary.preview,
        'lastTime': summary.last_event_text,
        'is_at': summary.mention_state is MentionState.DIRECT,
        'isGroup': summary.chat_type is ChatType.GROUP,
        'chatType': summary.chat_type.value,
        'chatTypeKnown': summary.chat_type is not ChatType.UNKNOWN,
        'driverEvidence': 'macos_ax_helper' }
    if summary.unread_count is not None:
        payload['unread'] = summary.unread_count
    if summary.is_self is not None:
        payload['isSelf'] = summary.is_self
    if summary.muted is not None:
        payload['muted'] = summary.muted
    return payload


def map_macos_monitor_session_batch(sessions = None, account_id = None, group_chat_lookup = None):
    normalized_account_id = account_id.strip() if isinstance(account_id, str) else ''
    if not normalized_account_id:
        raise ValueError('account_id must be a non-empty string')
    items = []
# WARNING: Decompyle incomplete


class MacOSMonitorSessionSource:
    '''Read once through the Driver; never duplicate Monitor decisions.'''
    
    def __init__(self = None, driver = None, group_chat_lookup = None):
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be a MacOSAxDriver')
        if not group_chat_lookup is not None and callable(group_chat_lookup):
            raise TypeError('group_chat_lookup must be callable or None')
        self._driver = driver
        self._group_chat_lookup = group_chat_lookup

    
    async def list_session_batch(self = None, account_id = None, limit = None, start_time = (20, None)):
        normalized_account_id = account_id.strip() if isinstance(account_id, str) else ''
        if not normalized_account_id:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'account_id must be a non-empty string')
        await self._driver.get_by_account(normalized_account_id)
        instance = <NODE:28>
        if instance is None:
            raise AutomationError(ErrorCode.ACCOUNT_NOT_INITIALIZED, 'monitor account is not attached: {}'.format(normalized_account_id))
        if instance.state is not InstanceState.READY:
            raise AutomationError(ErrorCode.INSTANCE_NOT_READY, 'monitor account instance is not ready')
        await self._driver.list_sessions(instance.instance_id, limit, start_time, **('limit', 'start_time'))
        sessions = <NODE:28>
        now_timestamp = time.time()
        cutoff = float(start_time) if start_time is not None and float(start_time) > 0 else now_timestamp - _WINDOWS_RECENT_SESSION_SECONDS
        now = datetime.fromtimestamp(now_timestamp)
        recent_sessions = None((lambda .0 = None: 