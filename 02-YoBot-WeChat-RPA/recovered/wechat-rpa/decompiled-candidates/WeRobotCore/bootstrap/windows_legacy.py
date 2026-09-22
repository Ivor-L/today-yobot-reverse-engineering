# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_legacy.marshal (Python 3.9)

'''Side-effect-free assembly for the mature Windows Legacy implementation.

This module deliberately does not import ``api_server``, ``api.chat`` or an
InstanceManager implementation.  The eventual Windows production entry point
must pass its already-created singleton and Facades into this factory.  Merely
constructing the bundle never discovers, initializes or operates WeChat.
'''
from dataclasses import dataclass
from typing import Callable, Dict
from WeRobotCore.adapters.wechat.windows_legacy import LegacyContactSnapshotFacade, LegacyContactDatabase, LegacyChatFacade, LegacyConversationFacade, LegacyInstanceManagerFacade, LegacyMessageEvidenceStore, LegacySessionIndex, LegacyTextMessageFacade, WINDOWS_LEGACY_DRIVER_ID, WindowsInstanceRegistryAdapter, WindowsLegacyContactDatabaseFacade, WindowsLegacyContactProviderAdapter, WindowsLegacyConversationReaderAdapter, WindowsLegacyMonitorSessionBatchBinder, WindowsLegacyMonitorSessionSource, WindowsLegacyTextMessageSenderAdapter
from WeRobotCore.application.runtime import PlatformServices, RuntimeCapabilityCatalog, RuntimeContainer, RuntimeDescriptor, RuntimeProductContract, WeChatAutomationGateway
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate
from WeRobotCore.application.auto_reply import AutoReplyRuntimeBindings, AutomationContextAutoReplyConversationInputReader, AutomationContextAutoReplyHistoryRecorder, AutomationContextAutoReplyTextSender
from WeRobotCore.domain import CapabilityName, CapabilityState, CapabilityStatus
WindowsLegacyRuntimeBundle = dataclass(True, **('frozen',))(<NODE:12>)

def _supported_capabilities():
    names = (CapabilityName.INSTANCE_ATTACH, CapabilityName.ACCOUNT_READ_CURRENT, CapabilityName.CONVERSATION_LIST, CapabilityName.CONVERSATION_READ, CapabilityName.MESSAGE_SEND_TEXT, CapabilityName.CONTACT_LIST, CapabilityName.GROUP_LIST)
    return (lambda .0: pass# WARNING: Decompyle incomplete
)(names)


def _require_methods(value = None, dependency_name = None, method_names = None):
    if value is None:
        raise ValueError('{} must be provided'.format(dependency_name))
    missing = (lambda .0 = None: [ method_name for method_name in .0 if callable(getattr(value, method_name, None)) ])(method_names)
    if missing:
        raise TypeError('{} does not provide required methods: {}'.format(dependency_name, ', '.join(missing)))


def create_windows_legacy_runtime(*, manager, conversations, messages, contacts, platform_services):
    '''Assemble Windows ports around dependencies owned by the old runtime.

    The caller may pass the same ``api.chat`` module as both ``conversations``
    and ``messages``.  Keeping the arguments capability-specific makes missing
    dependencies explicit and avoids turning a Legacy module into a new giant
    cross-platform interface.
    '''
    _require_methods(manager, 'manager', ('list_instances', 'get_instance_info', 'exit_instance', 're_enter_instance'))
    _require_methods(conversations, 'conversations', ('async_get_latest_sessions', 'async_get_chat_messages'))
    _require_methods(messages, 'messages', ('async_send_message',))
    _require_methods(contacts, 'contacts', ('async_list_contacts', 'async_list_groups'))
    if platform_services is None:
        raise ValueError('platform_services must be provided')
    session_index = LegacySessionIndex()
    evidence_store = LegacyMessageEvidenceStore()
    instance_adapter = WindowsInstanceRegistryAdapter(manager, _supported_capabilities(), **('capabilities',))
    conversation_adapter = WindowsLegacyConversationReaderAdapter(instance_adapter, conversations, session_index, evidence_store)
    message_adapter = WindowsLegacyTextMessageSenderAdapter(instance_adapter, messages, session_index)
    monitor_session_binder = WindowsLegacyMonitorSessionBatchBinder(instance_adapter, session_index)
    monitor_sessions = WindowsLegacyMonitorSessionSource(conversations, monitor_session_binder, **('batch_binder',))
    contact_adapter = WindowsLegacyContactProviderAdapter(instance_adapter, contacts)
    runtime = RuntimeContainer(RuntimeDescriptor('windows', WINDOWS_LEGACY_DRIVER_ID, **('platform', 'driver_id')), instance_adapter, conversation_adapter, message_adapter, contact_adapter, platform_services, **('descriptor', 'instances', 'conversations', 'messages', 'contacts', 'platform_services'))
    runtime.validate()
    gateway = WeChatAutomationGateway(runtime)
    
    def resolve_message_evidence(context = None, message = None):
        for message_key in (message.message_id, message.fingerprint):
            if not isinstance(message_key, str) or message_key:
                continue
            evidence = evidence_store.get(context.instance.instance_id, message.session_id, message_key)
            if evidence is not None:
                return evidence
            return None

    auto_reply_conversations = AutomationContextAutoReplyConversationInputReader(gateway, resolve_message_evidence, **('evidence_resolver',))
    auto_reply_text_sender = AutomationContextAutoReplyTextSender(gateway)
    return WindowsLegacyRuntimeBundle(runtime, gateway, instance_adapter, conversation_adapter, message_adapter, contact_adapter, session_index, evidence_store, monitor_session_binder, monitor_sessions, auto_reply_conversations, auto_reply_text_sender, **('runtime', 'gateway', 'instances', 'conversations', 'messages', 'contacts', 'session_index', 'evidence_store', 'monitor_session_binder', 'monitor_sessions', 'auto_reply_conversations', 'auto_reply_text_sender'))


def bind_existing_windows_legacy_dependencies(*, manager, chat, contact_database_factory, platform_services):
    '''Bind dependencies already owned by the mature Windows entry point.

    This helper does not import those dependencies or install the resulting
    bundle globally.  The future production call site must pass its existing
    ``instance_manager_v2`` object and the already-imported ``api.chat``
    module.  Keeping installation separate ensures this seam cannot switch
    the default business path merely by being imported.
    '''
    contacts = WindowsLegacyContactDatabaseFacade(contact_database_factory)
    return create_windows_legacy_runtime(manager, chat, chat, contacts, platform_services, **('manager', 'conversations', 'messages', 'contacts', 'platform_services'))


def create_windows_auto_reply_runtime_bindings(*, bundle, history_store_factory):
    '''Add shared product storage to an already assembled Driver bundle.

    This factory does not install the bindings, start a manager, touch storage,
    or import a production entry point.  The store factory remains lazy inside
    the history recorder and is owned by the shared product layer.
    '''
    if not isinstance(bundle, WindowsLegacyRuntimeBundle):
        raise TypeError('bundle must be WindowsLegacyRuntimeBundle')
    history_recorder = AutomationContextAutoReplyHistoryRecorder(bundle.gateway, history_store_factory)
    return AutoReplyRuntimeBindings(bundle.monitor_sessions, bundle.auto_reply_conversations, bundle.auto_reply_text_sender, history_recorder, **('monitor_sessions', 'conversation_input_reader', 'text_sender', 'history_recorder'))


def create_windows_product_runtime_candidate(*, bundle, history_store_factory, capability_catalog, app_version, architecture):
    '''Project one existing Windows bundle into the common product boundary.'''
    bindings = create_windows_auto_reply_runtime_bindings(bundle, history_store_factory, **('bundle', 'history_store_factory'))
    return ProductRuntimeCandidate(bundle.runtime, bindings, RuntimeProductContract(bundle.runtime.descriptor, capability_catalog, app_version, architecture, **('descriptor', 'capability_catalog', 'app_version', 'architecture')), **('runtime', 'auto_reply', 'runtime_contract'))

