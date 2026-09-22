"""Only the two enums used by the recovered message methods are restored here.
The original module's remaining models have not yet been restored.
"""
from enum import Enum


class ChatType(str, Enum):
    PRIVATE = 'private'
    GROUP = 'group'
    OFFICIAL = 'official'
    UNKNOWN = 'unknown'


class MessageDirection(str, Enum):
    INCOMING = 'incoming'
    OUTGOING = 'outgoing'
    UNKNOWN = 'unknown'
