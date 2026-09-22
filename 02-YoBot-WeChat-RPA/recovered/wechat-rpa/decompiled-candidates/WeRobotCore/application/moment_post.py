# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: moment_post.marshal (Python 3.9)

'''Platform-neutral boundary for publishing one prepared Moment.

Scheduling, material-group selection and logging remain shared business
concerns.  A platform runtime receives one immutable, already validated group
and owns only the native publish transaction.
'''
from __future__ import annotations
from pathlib import Path
from typing import Optional, Protocol, Sequence, runtime_checkable
from WeRobotCore.domain import OperationResult
MOMENT_MEDIA_SUFFIXES = frozenset(('.png', '.jpg', '.jpeg', '.bmp', '.gif', '.mp4', '.mov', '.avi'))
MOMENT_MAX_MEDIA_FILES = 9

def collect_moment_media(group_path = None):
    '''Return Windows-compatible immediate media files deterministically.'''
    if not isinstance(group_path, Path):
        raise TypeError('group_path must be a pathlib.Path')
    if not group_path.is_dir():
        raise FileNotFoundError('素材组目录不存在')
    return tuple(sorted((lambda .0: 