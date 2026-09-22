# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime_composition.marshal (Python 3.9)

'''Explicit product-level bindings for the shared auto-reply workflow.'''
from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable
from WeRobotCore.application.monitoring import MonitorTelemetrySink, MonitorRuntimeSource, MonitorSessionSource
from conversation_reader import AutoReplyConversationInputReader
from history_recorder import AutoReplyHistoryRecorder
from runtime_dependencies import AutoReplyAccountRuntimeFactory, AutoReplyRuntimeConfigurationFactory, AutoReplyTaskHistoryStoreFactory
from text_sender import AutoReplyTextSender
from media_sender import AutoReplyMediaSender
from group_mention_sender import AutoReplyGroupMentionSender
from greeting_sender import GreetingMessageSender
AutoReplyRuntimeBindings = dataclass(True, **('frozen',))(<NODE:12>)
AutoReplyManagerBindingTarget = runtime_checkable(<NODE:12>)
AutoReplyMonitorBindingTarget = runtime_checkable(<NODE:12>)

def install_auto_reply_runtime_bindings(bindings = None, *, auto_reply_manager, multi_chat_monitor):
    '''Install one coherent Driver graph before either shared owner starts.'''
    if not isinstance(bindings, AutoReplyRuntimeBindings):
        raise TypeError('bindings must be AutoReplyRuntimeBindings')
    if not auto_reply_manager is None or isinstance(auto_reply_manager, AutoReplyManagerBindingTarget):
        raise TypeError('auto_reply_manager must implement AutoReplyManagerBindingTarget')
    if not multi_chat_monitor is None or isinstance(multi_chat_monitor, AutoReplyMonitorBindingTarget):
        raise TypeError('multi_chat_monitor must implement AutoReplyMonitorBindingTarget')
    if auto_reply_manager.is_running():
        raise RuntimeError('auto-reply manager is already running')
    if multi_chat_monitor.is_running():
        raise RuntimeError('multi-chat monitor is already running')
    if not bindings.monitor_runtime is not None and callable(getattr(multi_chat_monitor, 'bind_runtime_source', None)):
        raise TypeError('multi_chat_monitor must accept monitor runtime bindings')
    if not bindings.monitor_telemetry is not None and callable(getattr(multi_chat_monitor, 'bind_telemetry', None)):
        raise TypeError('multi_chat_monitor must accept monitor telemetry bindings')
    if bindings.configuration_factory is not None:
        if not callable(getattr(auto_reply_manager, 'bind_configuration_factory', None)):
            raise TypeError('auto_reply_manager must accept configuration factory bindings')
        if not callable(getattr(multi_chat_monitor, 'bind_configuration_factory', None)):
            raise TypeError('multi_chat_monitor must accept configuration factory bindings')
    if not bindings.account_runtime_factory is not None and callable(getattr(auto_reply_manager, 'bind_account_runtime_factory', None)):
        raise TypeError('auto_reply_manager must accept account runtime factory bindings')
    if not bindings.task_history_factory is not None and callable(getattr(auto_reply_manager, 'bind_task_history_factory', None)):
        raise TypeError('auto_reply_manager must accept task history factory bindings')
    if not bindings.media_sender is not None and callable(getattr(auto_reply_manager, 'bind_media_sender', None)):
        raise TypeError('auto_reply_manager must accept media sender bindings')
    if not bindings.group_mention_sender is not None and callable(getattr(auto_reply_manager, 'bind_group_mention_sender', None)):
        raise TypeError('auto_reply_manager must accept group mention sender bindings')
    if not bindings.greeting_sender is not None and callable(getattr(auto_reply_manager, 'bind_greeting_sender', None)):
        raise TypeError('auto_reply_manager must accept greeting sender bindings')
    if bindings.monitor_telemetry is not None:
        multi_chat_monitor.bind_telemetry(bindings.monitor_telemetry)
    if bindings.monitor_runtime is not None:
        multi_chat_monitor.bind_runtime_source(bindings.monitor_runtime)
    multi_chat_monitor.bind_session_source(bindings.monitor_sessions)
    if bindings.account_runtime_factory is not None:
        auto_reply_manager.bind_account_runtime_factory(bindings.account_runtime_factory)
    if bindings.configuration_factory is not None:
        multi_chat_monitor.bind_configuration_factory(bindings.configuration_factory)
        auto_reply_manager.bind_configuration_factory(bindings.configuration_factory)
    if bindings.task_history_factory is not None:
        auto_reply_manager.bind_task_history_factory(bindings.task_history_factory)
    auto_reply_manager.bind_conversation_input_reader(bindings.conversation_input_reader)
    auto_reply_manager.bind_text_sender(bindings.text_sender)
    if bindings.media_sender is not None:
        auto_reply_manager.bind_media_sender(bindings.media_sender)
    if bindings.group_mention_sender is not None:
        auto_reply_manager.bind_group_mention_sender(bindings.group_mention_sender)
    if bindings.greeting_sender is not None:
        auto_reply_manager.bind_greeting_sender(bindings.greeting_sender)
    auto_reply_manager.bind_history_recorder(bindings.history_recorder)

