# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: workflow.marshal (Python 3.9)

'''One-target automatic friend-add workflow with Windows-compatible results.

Retry policy deliberately lives above this workflow. A native submission is
never repeated inside one execution because a timeout after clicking Confirm
cannot prove that WeChat did not accept the request.
'''
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Mapping, Sequence, Tuple
from runtime import AddFriendRuntime

class AddFriendStatus(Enum, str):
    '''Stable business states returned by the mature Windows implementation.'''
    SUBMITTED = 'submitted'
    ALREADY = 'already'
    UNKNOWN = 'unknown'
    FREQUENT_RISK = 'frequent_risk'
    FAILED = 'failed'
    RETRYABLE = 'retryable'


def _required_text(name = None, value = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be non-empty text'.format(name))
    return value.strip()


def _optional_text(name = None, value = None):
    if value is None:
        return ''
    if not None(value, str):
        raise TypeError('{} must be text'.format(name))
    return value.strip()


def _tags(value = None):
