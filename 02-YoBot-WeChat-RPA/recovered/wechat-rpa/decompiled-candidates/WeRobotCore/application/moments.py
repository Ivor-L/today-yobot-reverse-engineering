# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moments.marshal (Python 3.9)

'''Platform-neutral business rules for automatic Moments interaction.

The Windows driver historically owned these parsers.  Keeping them here lets
the Windows UIA and macOS AX adapters apply the same filtering semantics
without importing either native automation stack into the other platform.
'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
import random
import re
import time
from typing import Any, Awaitable, Callable, Dict, Mapping, Optional, Protocol, Sequence, runtime_checkable
from WeRobotCore.domain import OperationResult
_PUBLISH_TIME_PATTERN = '(刚刚|\\d{1,2}分钟前|\\d{1,2}小时前|\\d{1,2}天前|昨天\\s*\\d{1,2}:\\d{2}|前天\\s*\\d{1,2}:\\d{2}|\\d{1,2}月\\d{1,2}日\\s*\\d{1,2}:\\d{2}|\\d{4}年\\d{1,2}月\\d{1,2}日\\s*\\d{1,2}:\\d{2})'

def parse_moment_publish_time(value = None, *, reference):
    '''Parse the WeChat 4.1 relative/absolute time vocabulary.'''
    pass
# WARNING: Decompyle incomplete


def parse_moment_item_41x(raw_text = None, *, publisher_candidates):
    """Parse one WeChat 4.1 accessibility row using Windows' mature rules.

    macOS exposes a Moment as one opaque AX row instead of separate publisher
    and content controls.  The historical first-space split is ambiguous for
    valid display names such as ``黃生 Maui``.  Synchronized contact names are
    therefore accepted as parsing hints only: the longest exact name prefix
    wins, while filtering remains governed by the Windows-compatible business
    rules below.  The first-space rule remains the compatibility fallback.
    """
    pass
# WARNING: Decompyle incomplete


def has_recent_moment_interaction(interactions = None, *, account_id, publisher, content, moment_id, publish_time, now):
    '''Match one previously interacted Moment without prefix collisions.

    Windows historically compares only the publisher and the first ten
    content characters.  That can stop at a newly published Moment whose
    opening text happens to be the same.  New records carry the native row ID;
    both new and legacy records are further disambiguated by full content and
    the estimated publication occurrence.
    '''
    if not now:
        pass
    reference = datetime.now().astimezone()
    if reference.tzinfo is None:
        reference = reference.astimezone()
    cutoff = reference - timedelta(48, **('hours',))
    if not content:
        pass
    current_content = re.sub('\\s+', ' ', str('')).strip()
    if not current_content:
        return False
    
    def interaction_time(value = None):
        pass
    # WARNING: Decompyle incomplete

    
    def time_resolution(value = None):
        if not value:
            pass
        text = str('').strip()
        if text == '刚刚' or '分钟前' in text:
            return 180
        if None in text:
            return 3900
        if None in text:
            return 90000

    for interaction in interactions:
        if account_id and interaction.get('account_id') != account_id:
            continue
        if not interaction.get('timestamp'):
            pass
        timestamp = interaction.get('time')
        logged_at = interaction_time(timestamp) if timestamp else None
        if logged_at is not None and logged_at < cutoff:
            continue
        action_types = interaction.get('type', ())
        if isinstance(action_types, str):
            action_types = (action_types,)
        if not any((lambda .0: for item in .0:
item in ('comment', 'like'))(action_types)):
            continue
        if interaction.get('publisher') != publisher:
            continue
        if not interaction.get('content'):
            pass
        stored_content = re.sub('\\s+', ' ', str('')).strip()
        if stored_content != current_content:
            continue
        if not interaction.get('publish_time'):
            pass
        stored_publish_time = str('').strip()
        if publish_time and stored_publish_time and logged_at is not None:
            current_published_at = parse_moment_publish_time(publish_time, reference, **('reference',))
            stored_published_at = parse_moment_publish_time(stored_publish_time, logged_at, **('reference',))
            if current_published_at is not None and stored_published_at is not None:
                tolerance = max(time_resolution(publish_time), time_resolution(stored_publish_time))
                if abs(current_published_at - stored_published_at) > tolerance:
                    continue
        if not interaction.get('moment_id'):
            pass
        stored_moment_id = str('').strip()
        if not moment_id:
            pass
        current_moment_id = str('').strip()
        if stored_moment_id and current_moment_id and stored_moment_id == current_moment_id:
            return True
        if None == current_content:
            return True
        return False

MomentRow = dataclass(True, **('frozen',))(<NODE:12>)
MomentsViewport = dataclass(True, **('frozen',))(<NODE:12>)
MomentCommentRuntime = runtime_checkable(<NODE:12>)

class MomentCommentWorkflow:
    '''Execute Windows-parity filtering over a platform Moments runtime.'''
    _MODES = frozenset(('like_only', 'comment_only', 'like_and_comment', 'like_always_and_comment'))
    _REVEAL_SCROLL_STEPS = (2, 3, 3, 3)
    _MAX_STAGNANT_VIEWPORTS = 6
    _MAX_CONSECUTIVE_ACTION_FAILURES = 3
    
    def __init__(self = None, runtime = None, *, sleeper, delay_sampler):
        if not isinstance(runtime, MomentCommentRuntime):
            raise TypeError('runtime must implement MomentCommentRuntime')
        if not callable(sleeper) or callable(delay_sampler):
            raise TypeError('workflow timing dependencies must be callable')
        self._runtime = runtime
        self._sleeper = sleeper
        self._delay_sampler = delay_sampler

    
    def _integer(settings = None, name = None, default = staticmethod):
        value = settings.get(name, default)
        if isinstance(value, bool):
            raise ValueError('{} must be an integer'.format(name))
        result = int(value)
        if result <= 0:
            raise ValueError('{} must be positive'.format(name))
        return result

    _integer = None(_integer)
    
    async def execute(self = None, *, account_id, task_id, settings, callback, cancel_checker):
        if not account_id:
            pass
        account = str('').strip()
        if not settings.get('agentId'):
            pass
        agent_id = str('').strip()
        if not account or agent_id:
            raise ValueError('account_id and agentId are required')
        if not settings.get('interactionMode'):
            pass
        mode = str('like_and_comment').strip()
        if mode not in self._MODES:
            raise ValueError('unsupported interactionMode: {}'.format(mode))
        comment_limit = self._integer(settings, 'commentLimit', 100)
        per_friend_limit = self._integer(settings, 'perFriendLimit', 2)
        reach_last = settings.get('reachLastPosition', 'stop') == 'stop'
        should_like = mode in ('like_only', 'like_and_comment', 'like_always_and_comment')
        should_comment = mode in ('comment_only', 'like_and_comment', 'like_always_and_comment')
        blacklist = (lambda .0: pass# WARNING: Decompyle incomplete
)(settings.get('blacklist', ()))
        selected_tags = tuple((lambda .0: 