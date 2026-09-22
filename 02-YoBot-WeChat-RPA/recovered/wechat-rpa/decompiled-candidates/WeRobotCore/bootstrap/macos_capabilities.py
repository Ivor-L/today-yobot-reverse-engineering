# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_capabilities.marshal (Python 3.9)

'''Explicit, fail-closed capability catalog for the macOS text MVP.'''
from typing import Iterable, Tuple
from WeRobotCore.application.runtime import RuntimeCapabilityCatalog
from WeRobotCore.domain import CapabilityName, CapabilityState, CapabilityStatus
MACOS_MVP_CAPABILITY_NAMES: Tuple[(str, ...)] = (CapabilityName.INSTANCE_ATTACH.value, CapabilityName.ACCOUNT_READ_CURRENT.value, CapabilityName.CONVERSATION_LIST.value, CapabilityName.CONVERSATION_READ.value, CapabilityName.MESSAGE_SEND_TEXT.value, CapabilityName.MESSAGE_SEND_IMAGE.value, CapabilityName.MESSAGE_SEND_FILE.value, CapabilityName.MESSAGE_SEND_FAVORITE.value, CapabilityName.MESSAGE_FORWARD.value, CapabilityName.MESSAGE_SEND_GREETING_GROUP.value, CapabilityName.MESSAGE_MASS_SEND.value, CapabilityName.CONTACT_AUTO_FOLLOW.value, CapabilityName.GROUP_MEMBER_MENTION_REPLY.value, CapabilityName.GROUP_MEMBER_INVITE.value, CapabilityName.GROUP_INVITE_JOIN.value, CapabilityName.GROUP_MEMBER_RESOLVE_SENDER.value, CapabilityName.CONTACT_LIST.value, CapabilityName.GROUP_LIST.value, CapabilityName.CONTACT_SYNC.value, CapabilityName.GROUP_SYNC.value, CapabilityName.CONTACT_SYNC_SCHEDULE.value, CapabilityName.MOMENTS_READ.value, CapabilityName.MOMENTS_PUBLISH.value, CapabilityName.MOMENTS_COMMENT.value, CapabilityName.FRIEND_ADD.value, CapabilityName.FRIEND_REQUEST_ACCEPT.value)
_CAPABILITY_PERMISSIONS = {
    CapabilityName.FRIEND_REQUEST_ACCEPT.value: ('accessibility',),
    CapabilityName.FRIEND_ADD.value: ('accessibility',),
    CapabilityName.MOMENTS_COMMENT.value: ('accessibility',),
    CapabilityName.MOMENTS_PUBLISH.value: ('accessibility',),
    CapabilityName.MOMENTS_READ.value: ('accessibility',),
    CapabilityName.CONTACT_SYNC_SCHEDULE.value: ('accessibility',),
    CapabilityName.GROUP_SYNC.value: ('accessibility',),
    CapabilityName.CONTACT_SYNC.value: ('accessibility',),
    CapabilityName.GROUP_LIST.value: ('accessibility',),
    CapabilityName.CONTACT_LIST.value: ('accessibility',),
    CapabilityName.GROUP_MEMBER_RESOLVE_SENDER.value: ('accessibility',),
    CapabilityName.GROUP_INVITE_JOIN.value: ('accessibility', 'screen_recording'),
    CapabilityName.GROUP_MEMBER_INVITE.value: ('accessibility',),
    CapabilityName.GROUP_MEMBER_MENTION_REPLY.value: ('accessibility',),
    CapabilityName.CONTACT_AUTO_FOLLOW.value: ('accessibility', 'screen_recording'),
    CapabilityName.MESSAGE_MASS_SEND.value: ('accessibility',),
    CapabilityName.MESSAGE_SEND_GREETING_GROUP.value: ('accessibility',),
    CapabilityName.MESSAGE_FORWARD.value: ('accessibility',),
    CapabilityName.MESSAGE_SEND_FAVORITE.value: ('accessibility',),
    CapabilityName.MESSAGE_SEND_FILE.value: ('accessibility',),
    CapabilityName.MESSAGE_SEND_IMAGE.value: ('accessibility',),
    CapabilityName.MESSAGE_SEND_TEXT.value: ('accessibility',),
    CapabilityName.CONVERSATION_READ.value: ('accessibility', 'screen_recording'),
    CapabilityName.CONVERSATION_LIST.value: ('accessibility',),
    CapabilityName.ACCOUNT_READ_CURRENT.value: ('accessibility',),
    CapabilityName.INSTANCE_ATTACH.value: ('accessibility',) }

def create_macos_mvp_capability_catalog(experimental_capabilities = None):
    '''Declare the MVP surface while enabling only audited work packages.'''
    enabled = set(experimental_capabilities)
    unknown = enabled.difference(MACOS_MVP_CAPABILITY_NAMES)
    if unknown:
        raise ValueError('unknown macOS MVP capabilities: {}'.format(', '.join(sorted(unknown))))
    declarations = []
    for name in MACOS_MVP_CAPABILITY_NAMES:
        if name in enabled:
            declarations.append(CapabilityState(name, CapabilityStatus.EXPERIMENTAL, 'MACOS_MVP_DRIVER_INTEGRATION', _CAPABILITY_PERMISSIONS[name], **('name', 'status', 'reason_code', 'required_permissions')))
            continue
        declarations.append(CapabilityState(name, CapabilityStatus.UNAVAILABLE, 'MACOS_MVP_ACTION_NOT_WIRED', **('name', 'status', 'reason_code')))
    return RuntimeCapabilityCatalog(declarations)

