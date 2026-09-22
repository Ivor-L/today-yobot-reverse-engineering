# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''Composition root for the incremental macOS Driver implementation.'''
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional
from WeRobotCore.adapters.wechat.macos_ax import MACOS_AX_DRIVER_ID, MacOSAxDriver, MacOSControlHelperSessionFactory, MacOSHelperClient, MacOSNativeHelperBackend, MacOSInstanceBindingStore, MacOSInstanceInitializationBackend, MacOSInstanceInventorySource, MacOSMonitorRuntimeSource, MacOSMonitorSessionSource, SessionMacOSHelperTransport
from WeRobotCore.adapters.auto_reply import MacOSAutoReplyAccountRuntimeFactory
from WeRobotCore.application.runtime import PlatformServices, RuntimeCapabilityCatalog, RuntimeContainer, RuntimeDescriptor, WeChatAutomationGateway
from WeRobotCore.application.auto_reply import AutoReplyAccountRuntimeFactory, AutoReplyRuntimeConfigurationFactory, AutoReplyRuntimeBindings, AutoReplyTaskHistoryStoreFactory, AutomationContextAutoReplyConversationInputReader, AutomationContextAutoReplyHistoryRecorder, AutomationContextAutoReplyTextSender, AutomationContextAutoReplyMediaSender, AutomationContextAutoReplyGroupMentionSender, AutomationContextGreetingMessageSender
from WeRobotCore.application.contacts import AutomationContextContactSyncService
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate
from WeRobotCore.application.runtime import RuntimeProductContract
from WeRobotCore.application.monitoring import MonitorTelemetrySink, NullMonitorTelemetrySink
from WeRobotCore.domain import CapabilityName
from macos_capabilities import create_macos_mvp_capability_catalog
MacOSRuntimeBundle = dataclass(True, **('frozen',))(<NODE:12>)

def create_macos_control_helper_client(*, helper_bundle_path, expected_helper_bundle_version, expected_team_identifier, expected_control_identifier, expected_helper_identifier, startup_timeout_seconds, native_backend):
    '''Compose the signed Control transport without launching the Helper.'''
    session_factory = MacOSControlHelperSessionFactory(helper_bundle_path, expected_control_identifier, expected_helper_identifier, expected_helper_bundle_version, expected_team_identifier, startup_timeout_seconds, native_backend, **('helper_bundle_path', 'expected_control_identifier', 'expected_helper_identifier', 'expected_helper_bundle_version', 'expected_team_identifier', 'startup_timeout_seconds', 'backend'))
    return MacOSHelperClient(SessionMacOSHelperTransport(session_factory))


def create_macos_runtime(*, helper_client, platform_services, capability_catalog, driver_id, instance_binding_store, monitor_group_chat_lookup):
    '''Compose a Mac runtime without starting Helper or touching WeChat.

    With no catalog supplied, all MVP capabilities are declared unavailable.
    Later M2 work packages enable capabilities one by one after their adapter,
    mapper and native Helper action have passed the relevant gate.
    '''
    if not capability_catalog:
        pass
    catalog = create_macos_mvp_capability_catalog()
    driver = MacOSAxDriver(helper_client, catalog.snapshot_capabilities(), driver_id, **('capabilities', 'driver_id'))
    runtime = RuntimeContainer(RuntimeDescriptor('darwin', driver_id, **('platform', 'driver_id')), driver, driver, driver, driver, platform_services, **('descriptor', 'instances', 'conversations', 'messages', 'contacts', 'platform_services'))
    runtime.validate()
    gateway = WeChatAutomationGateway(runtime)
    inventory = MacOSInstanceInventorySource(driver, instance_binding_store)
    initialization = MacOSInstanceInitializationBackend(driver, instance_binding_store)
    monitor_sessions = MacOSMonitorSessionSource(driver, monitor_group_chat_lookup, **('group_chat_lookup',))
    monitor_runtime = MacOSMonitorRuntimeSource(driver, platform_services.processes)
    auto_reply_conversations = AutomationContextAutoReplyConversationInputReader(gateway)
    auto_reply_text_sender = AutomationContextAutoReplyTextSender(gateway)
    auto_reply_media_sender = AutomationContextAutoReplyMediaSender(gateway)
    auto_reply_group_mention_sender = AutomationContextAutoReplyGroupMentionSender(gateway)
    greeting_sender = AutomationContextGreetingMessageSender(gateway)
    return MacOSRuntimeBundle(runtime, gateway, driver, helper_client, catalog, inventory, initialization, monitor_sessions, monitor_runtime, auto_reply_conversations, auto_reply_text_sender, auto_reply_media_sender, auto_reply_group_mention_sender, greeting_sender, **('runtime', 'gateway', 'driver', 'helper_client', 'capability_catalog', 'inventory', 'initialization', 'monitor_sessions', 'monitor_runtime', 'auto_reply_conversations', 'auto_reply_text_sender', 'auto_reply_media_sender', 'auto_reply_group_mention_sender', 'greeting_sender'))


def create_macos_auto_reply_runtime_bindings(*, bundle, history_store_factory, account_runtime_factory, monitor_telemetry, configuration_factory, task_history_factory):
    '''Bind the shared auto-reply chain to an assembled macOS Driver.

    Construction is side-effect free: it does not start monitoring, launch the
    Helper, inspect WeChat, or create the history store. Product startup owns
    installation after the remaining macOS MVP gates close.
    '''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    history_recorder = AutomationContextAutoReplyHistoryRecorder(bundle.gateway, history_store_factory)
    if not bundle.auto_reply_media_sender:
        pass
    if not account_runtime_factory:
        pass
    return AutoReplyRuntimeBindings(bundle.monitor_sessions, bundle.auto_reply_conversations, bundle.auto_reply_text_sender, AutomationContextAutoReplyMediaSender(bundle.gateway), AutomationContextAutoReplyGroupMentionSender(bundle.gateway) if not bundle.capability_catalog.snapshot_capabilities().get(CapabilityName.GROUP_MEMBER_MENTION_REPLY.value) is not None and bundle.capability_catalog.snapshot_capabilities()[CapabilityName.GROUP_MEMBER_MENTION_REPLY.value].available or bundle.auto_reply_group_mention_sender else None, AutomationContextGreetingMessageSender(bundle.gateway) if not bundle.capability_catalog.snapshot_capabilities().get(CapabilityName.MESSAGE_SEND_GREETING_GROUP.value) is not None and bundle.capability_catalog.snapshot_capabilities()[CapabilityName.MESSAGE_SEND_GREETING_GROUP.value].available or bundle.greeting_sender else None, history_recorder, bundle.monitor_runtime, NullMonitorTelemetrySink() if monitor_telemetry is None else monitor_telemetry, MacOSAutoReplyAccountRuntimeFactory(), configuration_factory, task_history_factory, **('monitor_sessions', 'conversation_input_reader', 'text_sender', 'media_sender', 'group_mention_sender', 'greeting_sender', 'history_recorder', 'monitor_runtime', 'monitor_telemetry', 'account_runtime_factory', 'configuration_factory', 'task_history_factory'))


def create_macos_contact_sync_service(*, bundle, store_factory):
    '''Bind shared contact sync without opening storage or inspecting WeChat.'''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    return AutomationContextContactSyncService(bundle.gateway, store_factory)


def create_macos_product_runtime_candidate(*, bundle, history_store_factory, capability_catalog, app_version, architecture, account_runtime_factory, monitor_telemetry, configuration_factory, task_history_factory):
    '''Project one macOS Driver graph into the shared product boundary.

    This mirrors the mature Windows candidate shape.  It does not publish the
    candidate, install bindings, start monitoring, open the Helper, or touch a
    history store.
    '''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    if capability_catalog is not bundle.capability_catalog:
        raise ValueError('capability_catalog must be the catalog used by the macOS runtime')
    bindings = create_macos_auto_reply_runtime_bindings(bundle, history_store_factory, account_runtime_factory, monitor_telemetry, configuration_factory, task_history_factory, **('bundle', 'history_store_factory', 'account_runtime_factory', 'monitor_telemetry', 'configuration_factory', 'task_history_factory'))
    return ProductRuntimeCandidate(bundle.runtime, bindings, RuntimeProductContract(bundle.runtime.descriptor, capability_catalog, app_version, architecture, **('descriptor', 'capability_catalog', 'app_version', 'architecture')), **('runtime', 'auto_reply', 'runtime_contract'))

