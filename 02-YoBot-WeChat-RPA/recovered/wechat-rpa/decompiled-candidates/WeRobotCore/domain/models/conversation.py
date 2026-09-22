# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: conversation.marshal (Python 3.9)

'''Normalized conversation and message facts shared by every RPA driver.'''
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Mapping, Optional, Tuple

class ChatType(Enum, str):
    PRIVATE = 'private'
    GROUP = 'group'
    OFFICIAL = 'official'
    UNKNOWN = 'unknown'


class MentionState(Enum, str):
    NONE = 'none'
    DIRECT = 'direct'
    ALL = 'all'
    UNKNOWN = 'unknown'


class MessageDirection(Enum, str):
    INCOMING = 'incoming'
    OUTGOING = 'outgoing'
    UNKNOWN = 'unknown'


class MessageContentType(Enum, str):
    TEXT = 'text'
    IMAGE = 'image'
    FILE = 'file'
    VOICE = 'voice'
    SYSTEM = 'system'
    UNKNOWN = 'unknown'

AttachmentRef = dataclass(True, **('frozen',))(<NODE:12>)
SessionSummary = dataclass(True, **('frozen',))(<NODE:12>)
MessageRecord = dataclass(True, **('frozen',))(<NODE:12>)
ConversationReadResult = dataclass(True, **('frozen',))(<NODE:12>)
