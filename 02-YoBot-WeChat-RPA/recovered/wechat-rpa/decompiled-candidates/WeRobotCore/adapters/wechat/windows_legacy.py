# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_legacy.marshal (Python 3.9)

'''Cross-platform-safe adapters for the existing Windows implementation.

Importing this package must remain safe on macOS and Linux.  Native/UIA
objects are supplied by a Windows composition root and are intentionally not
imported here.
'''
from instance_registry import LegacyInstanceManagerFacade, WindowsInstanceRegistryAdapter
from instance_inventory import LegacyInstanceInventoryFacade, WindowsLegacyInstanceInventorySource, map_legacy_instance_inventory, project_legacy_active_instances_response, project_legacy_agent_instances_status, project_legacy_all_instances_response
from instance_command_compatibility import WindowsLegacyInstanceCommandProjection, project_windows_legacy_exit, project_windows_legacy_switch
from instance_commands import WindowsLegacyInstanceCommandBackend, WindowsLegacyInstanceCommandOperations, WindowsLegacyInstanceContactStatsProvider, WindowsLegacyInstanceMonitorStopper
from initialization import WindowsLegacyInitializationBackend, WindowsLegacyInitializationOperations
from initialization_compatibility import WindowsLegacyInitializationCoordinator, WindowsLegacyInitializationProjection, WindowsLegacyInitializationRun, WindowsLegacyInitializationReporter, WindowsLegacySchedulerPostHook, project_windows_legacy_initialization
from bindings import LegacyMessageEvidenceStore, LegacySessionIndex
from conversation_reader import WindowsLegacyConversationReaderAdapter
from contact_database import WindowsLegacyContactDatabaseFacade
from contact_provider import WindowsLegacyContactProviderAdapter
from facades import LegacyChatFacade, LegacyContactDatabase, LegacyContactSnapshotFacade, LegacyConversationFacade, LegacyTextMessageFacade
from message_sender import WindowsLegacyTextMessageSenderAdapter
from monitor_session_source import WindowsLegacyMonitorSessionSource, map_legacy_monitor_session_batch
from monitor_session_binding import WindowsLegacyMonitorSessionBatchBinder
from startup import WINDOWS_STARTUP_DRIVER_ID, WindowsLegacyStartupBackend, WindowsLegacyStartupOperations
from mappers import WINDOWS_LEGACY_DRIVER_ID, map_legacy_conversation, map_legacy_contact, map_legacy_contacts, map_legacy_group, map_legacy_groups, map_legacy_instance, map_legacy_message, map_legacy_operation, map_legacy_session, map_legacy_sessions
__all__ = [
    'LegacyInstanceManagerFacade',
    'LegacyInstanceInventoryFacade',
    'LegacyChatFacade',
    'LegacyContactDatabase',
    'LegacyContactSnapshotFacade',
    'LegacyConversationFacade',
    'LegacyMessageEvidenceStore',
    'LegacySessionIndex',
    'LegacyTextMessageFacade',
    'WINDOWS_LEGACY_DRIVER_ID',
    'WINDOWS_STARTUP_DRIVER_ID',
    'WindowsLegacyConversationReaderAdapter',
    'WindowsLegacyContactDatabaseFacade',
    'WindowsLegacyContactProviderAdapter',
    'WindowsLegacyTextMessageSenderAdapter',
    'WindowsLegacyMonitorSessionSource',
    'WindowsLegacyMonitorSessionBatchBinder',
    'WindowsLegacyInstanceInventorySource',
    'WindowsLegacyInstanceCommandBackend',
    'WindowsLegacyInstanceCommandOperations',
    'WindowsLegacyInstanceCommandProjection',
    'WindowsLegacyInstanceContactStatsProvider',
    'WindowsLegacyInstanceMonitorStopper',
    'WindowsLegacyInitializationBackend',
    'WindowsLegacyInitializationCoordinator',
    'WindowsLegacyInitializationOperations',
    'WindowsLegacyInitializationProjection',
    'WindowsLegacyInitializationRun',
    'WindowsLegacyInitializationReporter',
    'WindowsLegacySchedulerPostHook',
    'WindowsLegacyStartupBackend',
    'WindowsLegacyStartupOperations',
    'WindowsInstanceRegistryAdapter',
    'map_legacy_conversation',
    'map_legacy_contact',
    'map_legacy_contacts',
    'map_legacy_group',
    'map_legacy_groups',
    'map_legacy_instance',
    'map_legacy_instance_inventory',
    'map_legacy_message',
    'map_legacy_monitor_session_batch',
    'map_legacy_operation',
    'map_legacy_session',
    'map_legacy_sessions',
    'project_legacy_active_instances_response',
    'project_legacy_agent_instances_status',
    'project_legacy_all_instances_response',
    'project_windows_legacy_exit',
    'project_windows_legacy_switch',
    'project_windows_legacy_initialization']
