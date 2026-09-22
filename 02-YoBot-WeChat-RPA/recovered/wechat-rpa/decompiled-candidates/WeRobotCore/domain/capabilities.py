# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: capabilities.marshal (Python 3.9)

'''Platform-neutral runtime capability declarations.'''
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Tuple

class CapabilityStatus(Enum, str):
    SUPPORTED = 'supported'
    EXPERIMENTAL = 'experimental'
    PERMISSION_REQUIRED = 'permission_required'
    CLIENT_VERSION_UNSUPPORTED = 'client_version_unsupported'
    UNAVAILABLE = 'unavailable'


class CapabilityName(Enum, str):
    INSTANCE_ATTACH = 'instance.attach'
    INSTANCE_LAUNCH = 'instance.launch'
    INSTANCE_INITIALIZE = 'instance.initialize'
    INSTANCE_SWITCH = 'instance.switch'
    INSTANCE_EXIT = 'instance.exit'
    ACCOUNT_READ_CURRENT = 'account.read_current'
    CONVERSATION_LIST = 'conversation.list'
    CONVERSATION_READ = 'conversation.read'
    CONVERSATION_COLLECT = 'conversation.collect'
    MESSAGE_SEND_TEXT = 'message.send_text'
    MESSAGE_SEND_IMAGE = 'message.send_image'
    MESSAGE_SEND_FILE = 'message.send_file'
    MESSAGE_SEND_FAVORITE = 'message.send_favorite'
    MESSAGE_FORWARD = 'message.forward'
    MESSAGE_MASS_SEND = 'message.mass_send'
    MESSAGE_SEND_GREETING_GROUP = 'message.send_greeting_group'
    CONTACT_LIST = 'contact.list'
    CONTACT_SYNC = 'contact.sync'
    CONTACT_SYNC_SCHEDULE = 'contact.sync.schedule'
    CONTACT_AUTO_FOLLOW = 'contact.auto_follow'
    GROUP_LIST = 'group.list'
    GROUP_SYNC = 'group.sync'
    GROUP_MEMBER_INVITE = 'group.member.invite'
    GROUP_INVITE_JOIN = 'group.invite.join'
    GROUP_MEMBER_MENTION_REPLY = 'group.member.mention_reply'
    FRIEND_ADD = 'friend.add'
    FRIEND_REQUEST_ACCEPT = 'friend.request.accept'
    GROUP_MEMBER_RESOLVE_SENDER = 'group.member.resolve_sender'
    MOMENTS_READ = 'moments.read'
    MOMENTS_PUBLISH = 'moments.publish'
    MOMENTS_COMMENT = 'moments.comment'
    VOICE_SEND = 'voice.send'

CapabilityState = dataclass(True, **('frozen',))(<NODE:12>)
