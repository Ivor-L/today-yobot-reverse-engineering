# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_feature_policy.marshal (Python 3.9)

'''Pre-start compatibility checks for the macOS AutoReply MVP.'''
from typing import Mapping, Sequence
from WeRobotCore.application.auto_reply.config_readiness import AutoReplyConfigurationFacade
from WeRobotCore.application.runtime import RuntimeCapabilityCatalog
from WeRobotCore.domain import CapabilityName

class MacOSTextAutoReplyFeatureValidator:
    '''Reject configured features that still require Windows native actions.'''
    _STAFF_FLAGS = (('voiceEnabled', '语音回复'),)
    _CAPABILITY_STAFF_FLAGS = (('autoJoinGroup', '群邀请自动加入', CapabilityName.GROUP_INVITE_JOIN.value), ('mentionReply', '@群成员回复', CapabilityName.GROUP_MEMBER_MENTION_REPLY.value))
    _SOP_ACTION_CAPABILITIES = {
        'greeting': CapabilityName.MESSAGE_SEND_GREETING_GROUP.value,
        'pull_into_group': CapabilityName.GROUP_MEMBER_INVITE.value,
        'create_follow': CapabilityName.CONTACT_AUTO_FOLLOW.value }
    _SOP_ACTION_TARGETS = {
        'greeting': frozenset(('single', 'group')),
        'pull_into_group': frozenset(('single',)),
        'create_follow': frozenset(('single', 'group')) }
    
    def __init__(self = None, capability_catalog = None):
        if not isinstance(capability_catalog, RuntimeCapabilityCatalog):
            raise TypeError('capability_catalog must be RuntimeCapabilityCatalog')
        self._capabilities = capability_catalog.snapshot_capabilities()

    
    def _capability_available(self = None, name = None):
        state = self._capabilities.get(name)
        if state is not None:
            pass
        return state.available

    
    def _sop_supported(self = None, global_config = None, sop_id = None, target_type = {
        'global_config': AutoReplyConfigurationFacade,
        'sop_id': str,
        'target_type': str,
        'return': bool }):
        lookup = getattr(global_config, 'get_sop_by_id', None)
        if not callable(lookup):
            return False
        sop = None(sop_id)
        if not isinstance(sop, Mapping):
            return False
        if not None.get('actions'):
            pass
        actions = []
        if not isinstance(actions, (str, bytes)) or isinstance(actions, Sequence):
            return False
        for action in None:
            if not isinstance(action, Mapping):
                return False
            action_type = None.get('type')
            applicable = self._SOP_ACTION_TARGETS.get(action_type)
            capability = self._SOP_ACTION_CAPABILITIES.get(action_type)
            if applicable is None or capability is None:
                return False
            if not None in applicable and self._capability_available(capability):
                return False
            return True

    
    def __call__(self = None, account_config = None, global_config = None):
        if not account_config.load_config('reply_strategy_v2'):
            pass
        reply_config = { }
        if not isinstance(reply_config, Mapping):
            raise TypeError('reply_strategy_v2 must be a mapping')
        unsupported = []
        if not reply_config.get('staffList', []):
            pass
        for staff in []:
            if not isinstance(staff, Mapping) or staff.get('enabled', False):
                continue
            for key, label in self._STAFF_FLAGS:
                if staff.get(key, False):
                    unsupported.append(label)
                    continue
                    for key, label, capability_name in self._CAPABILITY_STAFF_FLAGS:
                        if not staff.get(key, False) and self._capability_available(capability_name):
                            unsupported.append(label)
                            continue
                            continue
                            if not reply_config.get('commonConfig'):
                                pass
        common = { }
        if not isinstance(common, Mapping):
            raise TypeError('reply_strategy_v2.commonConfig must be a mapping')
        group_join_sop_id = common.get('groupJoinSopId')
        if not group_join_sop_id and self._sop_supported(global_config, group_join_sop_id, 'group'):
            unsupported.append('进群运营SOP')
        friend_pass_sop_id = common.get('friendPassSopId')
        if not friend_pass_sop_id and self._sop_supported(global_config, friend_pass_sop_id, 'single'):
            unsupported.append('新好友运营SOP')
        if not common.get('autoGreeting'):
            pass
        auto_greeting = { }
        if not isinstance(auto_greeting, Mapping) and auto_greeting.get('enabled', False) and self._capability_available(CapabilityName.MESSAGE_SEND_GREETING_GROUP.value):
            unsupported.append('新好友话术组')
        if not account_config.load_config('chat_history_settings'):
            pass
        history = { }
        if isinstance(history, Mapping):
            if not history.get('chat_history_settings'):
                pass
            settings = { }
            transfer = settings.get('transferConfig') if isinstance(settings, Mapping) else None
            if not isinstance(transfer, Mapping) and transfer.get('notifyWechat') and self._capability_available(CapabilityName.MESSAGE_SEND_TEXT.value):
                unsupported.append('转人工微信通知')
        return tuple(dict.fromkeys(unsupported))


__all__ = [
    'MacOSTextAutoReplyFeatureValidator']
