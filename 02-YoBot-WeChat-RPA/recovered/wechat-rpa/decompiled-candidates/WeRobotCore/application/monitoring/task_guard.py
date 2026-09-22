# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: task_guard.marshal (Python 3.9)

'''Platform-neutral safety decisions before a monitor change creates a task.'''
from typing import Optional
from WeRobotCore.domain import ChatType, SessionSummary
CHAT_TYPE_UNKNOWN = 'CHAT_TYPE_UNKNOWN'
SESSION_PREVIEW_SELF = 'SESSION_PREVIEW_SELF'

def monitor_task_skip_reason(summary = None):
    '''Return a stable reason when session evidence cannot trigger a task.

    Drivers report facts; they do not guess a private chat when the UI only
    proves that a session exists.  The shared monitor consumes the observed
    change but waits for a later, resolved change instead of creating a task
    from ambiguous or explicitly self-authored evidence.
    '''
    if not isinstance(summary, SessionSummary):
        raise TypeError('summary must be a SessionSummary')
    if summary.chat_type is ChatType.UNKNOWN:
        return CHAT_TYPE_UNKNOWN
    if None.is_self is True:
        return SESSION_PREVIEW_SELF

