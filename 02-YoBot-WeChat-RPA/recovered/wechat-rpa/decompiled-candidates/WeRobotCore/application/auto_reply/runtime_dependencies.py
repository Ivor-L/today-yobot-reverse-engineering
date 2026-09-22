# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime_dependencies.marshal (Python 3.9)

'''Runtime-only dependencies consumed by the mature AutoReply workflow.

The Driver ports cover WeChat inspection and mutation.  AutoReply also needs
configuration and conversation history while a task is being filtered and
executed.  Those dependencies used to be constructed from process globals in
the V2/V3 classes, which is safe for the Windows Legacy entry but would make a
macOS product silently read or create the Windows storage layout.

These protocols deliberately describe the existing business-facing method
surface.  They do not move matching, filtering, context or SOP policy into a
platform Driver.
'''
from __future__ import annotations
from typing import Any, Dict, List, Mapping, Optional, Protocol, Sequence, runtime_checkable
from WeRobotCore.domain import AutomationError, ErrorCode
AutoReplyAccountRuntime = runtime_checkable(<NODE:12>)
AutoReplyAccountRuntimeFactory = runtime_checkable(<NODE:12>)

class LegacyAutoReplyAccountRuntime:
    '''Narrow projection over the mature Windows ``WeChat`` object.'''
    
    def __init__(self = None, wechat = None):
        if wechat is None:
            raise TypeError('wechat must not be None')
        self._wechat = wechat

    
    def account_info(self = None):
        value = getattr(self._wechat, 'account_info', None)
        if isinstance(value, Mapping):
            return value

    account_info = None(account_info)
    
    def wechat_build(self = None):
        driver = getattr(self._wechat, '_driver', None)
        if driver is not None:
            return getattr(driver, 'wechat_build', None)

    wechat_build = None(wechat_build)
    
    def get_group_msg_sender(self = None, message_id = None):
        return self._wechat.get_group_msg_sender(message_id)

    
    def get_images_by_id(self = None, message_id = None, max_images = None):
        return self._wechat.get_images_by_id(message_id, max_images, **('max_images',))

    
    def require_native_client(self = None, feature = None):
        if not isinstance(feature, str) or feature.strip():
            raise ValueError('feature must be a non-empty string')
        return self._wechat



class LegacyAutoReplyAccountRuntimeFactory:
    '''Create the Windows native object only when a partition/task needs it.'''
    
    def for_account(self = None, account_id = None):
        if account_id is not None:
            if not isinstance(account_id, str) or account_id.strip():
                raise ValueError('account_id must be a non-empty string or None')
        WeChat = WeChat
        import WeRobotCore.core.WeChatType
        wechat = WeChat(account_id, **('account_id',)) if account_id else WeChat()
        return require_account_runtime(LegacyAutoReplyAccountRuntime(wechat))



def unsupported_account_runtime_feature(feature = None):
    '''Return the shared fail-closed error for an unavailable native action.'''
    if not isinstance(feature, str) or feature.strip():
        raise ValueError('feature must be a non-empty string')
    return AutomationError(ErrorCode.CAPABILITY_UNAVAILABLE, 'auto-reply native feature is unavailable: {}'.format(feature.strip()), False, **('retryable',))

AutoReplyRuntimeConfiguration = runtime_checkable(<NODE:12>)
AutoReplyRuntimeConfigurationFactory = runtime_checkable(<NODE:12>)
AutoReplyTaskHistoryStore = runtime_checkable(<NODE:12>)
AutoReplyTaskHistoryStoreFactory = runtime_checkable(<NODE:12>)

def require_runtime_configuration(value = None):
    if not value is None or isinstance(value, AutoReplyRuntimeConfiguration):
        raise TypeError('configuration factory must return AutoReplyRuntimeConfiguration')
    return value


def require_account_runtime(value = None):
    if not value is None or isinstance(value, AutoReplyAccountRuntime):
        raise TypeError('account runtime factory must return AutoReplyAccountRuntime')
    return value


def require_task_history_store(value = None):
    if not value is None or isinstance(value, AutoReplyTaskHistoryStore):
        raise TypeError('history factory must return AutoReplyTaskHistoryStore')
    return value


class LegacyAutoReplyRuntimeConfigurationFactory:
    '''Lazy adapter preserving the exact ConfigManager construction contract.'''
    
    def for_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        ConfigManager = ConfigManager
        import WeRobotCore.utils.config_manager
        return require_runtime_configuration(ConfigManager(account_id, **('user_id',)))

    
    def global_configuration(self = None):
        ConfigManager = ConfigManager
        import WeRobotCore.utils.config_manager
        return require_runtime_configuration(ConfigManager())



class LegacyAutoReplyTaskHistoryStoreFactory:
    '''Lazy adapter preserving the exact ChatHistoryManager account scope.'''
    
    def for_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        ChatHistoryManager = ChatHistoryManager
        import WeRobotCore.utils.chat_history
        return require_task_history_store(ChatHistoryManager(account_id))


__all__ = [
    'AutoReplyAccountRuntime',
    'AutoReplyAccountRuntimeFactory',
    'AutoReplyRuntimeConfiguration',
    'AutoReplyRuntimeConfigurationFactory',
    'AutoReplyTaskHistoryStore',
    'AutoReplyTaskHistoryStoreFactory',
    'LegacyAutoReplyAccountRuntime',
    'LegacyAutoReplyAccountRuntimeFactory',
    'LegacyAutoReplyRuntimeConfigurationFactory',
    'LegacyAutoReplyTaskHistoryStoreFactory',
    'require_account_runtime',
    'require_runtime_configuration',
    'require_task_history_store',
    'unsupported_account_runtime_feature']
