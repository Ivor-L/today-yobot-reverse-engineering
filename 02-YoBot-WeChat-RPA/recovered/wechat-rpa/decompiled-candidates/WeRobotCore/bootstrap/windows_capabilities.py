# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_capabilities.marshal (Python 3.9)

'''Explicit build capability catalog for the Windows legacy product.

This module describes product routes and mature Windows task paths, not only
the methods currently exposed by the new Driver ports.  Every declaration is
listed deliberately: adding a new ``CapabilityName`` never grants it to the
Windows artifact automatically.

The factory is side-effect free and does not inspect the operating system,
the installed WeChat version, an account, permissions or native UI state.
Those facts remain account/request-level execution gates.
'''
from typing import Tuple
from WeRobotCore.application.runtime import RuntimeCapabilityCatalog
from WeRobotCore.domain import CapabilityName, CapabilityState, CapabilityStatus
WINDOWS_LEGACY_SUPPORTED_PRODUCT_CAPABILITIES: Tuple[(CapabilityName, ...)] = (CapabilityName.INSTANCE_ATTACH, CapabilityName.INSTANCE_LAUNCH, CapabilityName.INSTANCE_INITIALIZE, CapabilityName.INSTANCE_SWITCH, CapabilityName.INSTANCE_EXIT, CapabilityName.ACCOUNT_READ_CURRENT, CapabilityName.CONVERSATION_LIST, CapabilityName.CONVERSATION_READ, CapabilityName.MESSAGE_SEND_TEXT, CapabilityName.MESSAGE_SEND_IMAGE, CapabilityName.MESSAGE_SEND_FILE, CapabilityName.MESSAGE_SEND_FAVORITE, CapabilityName.MESSAGE_FORWARD, CapabilityName.MESSAGE_MASS_SEND, CapabilityName.MESSAGE_SEND_GREETING_GROUP, CapabilityName.CONTACT_LIST, CapabilityName.CONTACT_SYNC, CapabilityName.CONTACT_SYNC_SCHEDULE, CapabilityName.CONTACT_AUTO_FOLLOW, CapabilityName.GROUP_LIST, CapabilityName.GROUP_SYNC, CapabilityName.GROUP_MEMBER_INVITE, CapabilityName.GROUP_INVITE_JOIN, CapabilityName.GROUP_MEMBER_MENTION_REPLY, CapabilityName.FRIEND_ADD, CapabilityName.FRIEND_REQUEST_ACCEPT, CapabilityName.GROUP_MEMBER_RESOLVE_SENDER, CapabilityName.MOMENTS_READ, CapabilityName.MOMENTS_PUBLISH, CapabilityName.MOMENTS_COMMENT, CapabilityName.VOICE_SEND)

def create_windows_legacy_product_capability_catalog():
    '''Build the reviewed Windows product directory without inference.

    ``conversation.collect`` is deliberately declared unavailable instead of
    omitted so a strict client receives the stable reason exposed by the
    currently disabled product routes.
    '''
    supported = tuple((lambda .0: for capability in .0:
CapabilityState(capability.value, CapabilityStatus.SUPPORTED, **('name', 'status')))(WINDOWS_LEGACY_SUPPORTED_PRODUCT_CAPABILITIES))
    return RuntimeCapabilityCatalog(supported + (CapabilityState(CapabilityName.CONVERSATION_COLLECT.value, CapabilityStatus.UNAVAILABLE, 'PRODUCT_ROUTE_DISABLED', **('name', 'status', 'reason_code')),))

__all__ = [
    'WINDOWS_LEGACY_SUPPORTED_PRODUCT_CAPABILITIES',
    'create_windows_legacy_product_capability_catalog']
