# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: task_system_v3.marshal (Python 3.9)

'''Task System V3 public API with side-effect-free package imports.

The original package imported every task family eagerly. Importing only the
shared AutoReply manager therefore also loaded Windows-only mass sending,
moments and UIA modules. Public names and their modules remain unchanged, but
each implementation is now imported only when that name is requested.
'''
from importlib import import_module
from types import ExecutionMode, PermissionLevel, PermissionRequest, ScheduleConfig, SchedulerState, SchedulerStatus, SchedulerType, TaskExecutionContext, TaskPriority, TaskStatus, TaskType, TriggerType
__version__ = '3.0.0-alpha'
_LAZY_EXPORTS = {
    'UnifiedScheduler': ('.unified_scheduler', 'UnifiedScheduler'),
    'PermissionManager': ('.permission_manager', 'PermissionManager'),
    'MassSendingAdapter': ('.mass_sending_adapter', 'MassSendingAdapter'),
    'MassSendingManager': ('.mass_sending_manager', 'MassSendingManager'),
    'AutoReplyAdapterV3': ('.auto_reply_adapter', 'AutoReplyAdapterV3'),
    'AutoReplyManager': ('.auto_reply_manager', 'AutoReplyManager'),
    'MomentCommentAdapter': ('.moment_comment_adapter', 'MomentCommentAdapter'),
    'MomentCommentManager': ('.moment_comment_manager', 'MomentCommentManager'),
    'FriendRequestAdapter': ('.friend_request_adapter', 'FriendRequestAdapter'),
    'FriendRequestManager': ('.friend_request_manager', 'FriendRequestManager'),
    'AddFriendAdapter': ('.add_friend_adapter', 'AddFriendAdapter'),
    'AddFriendManager': ('.add_friend_manager', 'AddFriendManager'),
    'AutoFollowAdapter': ('.auto_follow_adapter', 'AutoFollowAdapter'),
    'AutoFollowManager': ('.auto_follow_manager', 'AutoFollowManager'),
    'SyncContactsAdapter': ('.sync_contacts_adapter', 'SyncContactsAdapter'),
    'SyncContactsManager': ('.sync_contacts_manager', 'SyncContactsManager'),
    'MomentPostAdapter': ('.moment_post_adapter', 'MomentPostAdapter'),
    'MomentPostManager': ('.moment_post_manager', 'MomentPostManager'),
    'get_auto_reply_manager': ('.unified_manager_pattern', 'get_auto_reply_manager'),
    'get_friend_request_manager': ('.unified_manager_pattern', 'get_friend_request_manager'),
    'get_mass_sending_manager': ('.unified_manager_pattern', 'get_mass_sending_manager'),
    'get_moment_comment_manager': ('.unified_manager_pattern', 'get_moment_comment_manager'),
    'get_moment_post_manager': ('.unified_manager_pattern', 'get_moment_post_manager'),
    'get_add_friend_manager': ('.unified_manager_pattern', 'get_add_friend_manager'),
    'get_sync_contacts_manager': ('.unified_manager_pattern', 'get_sync_contacts_manager'),
    'get_scheduler': ('.unified_manager_pattern', 'get_scheduler'),
    'create_friend_request_manager': ('.unified_manager_pattern', 'create_friend_request_manager'),
    'create_moment_comment_manager': ('.unified_manager_pattern', 'create_moment_comment_manager') }
__all__ = [
    'TaskType',
    'TaskStatus',
    'TaskPriority',
    'SchedulerType',
    'ExecutionMode',
    'TriggerType',
    'PermissionLevel',
    'ScheduleConfig',
    'TaskExecutionContext',
    'PermissionRequest',
    'SchedulerState',
    'SchedulerStatus',
    'UnifiedScheduler',
    'PermissionManager',
    'MassSendingAdapter',
    'MassSendingManager',
    'AutoReplyAdapterV3',
    'AutoReplyManager',
    'MomentCommentAdapter',
    'MomentCommentManager',
    'create_moment_comment_manager',
    'FriendRequestAdapter',
    'FriendRequestManager',
    'create_friend_request_manager',
    'AddFriendAdapter',
    'AddFriendManager',
    'AutoFollowAdapter',
    'AutoFollowManager',
    'SyncContactsAdapter',
    'SyncContactsManager',
    'MomentPostAdapter',
    'MomentPostManager',
    'get_auto_reply_manager',
    'get_friend_request_manager',
    'get_mass_sending_manager',
    'get_moment_comment_manager',
    'get_moment_post_manager',
    'get_add_friend_manager',
    'get_sync_contacts_manager',
    'get_scheduler']

def __getattr__(name):
    target = _LAZY_EXPORTS.get(name)
    if target is None:
        raise AttributeError('module {!r} has no attribute {!r}'.format(__name__, name))
    (module_name, attribute_name) = target
    value = getattr(import_module(module_name, __name__), attribute_name)
    globals()[name] = value
    return value


def __dir__():
    return sorted(set(globals()) | set(__all__))

