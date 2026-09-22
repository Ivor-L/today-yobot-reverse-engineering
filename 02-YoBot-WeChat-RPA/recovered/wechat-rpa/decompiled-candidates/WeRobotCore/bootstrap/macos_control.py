# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_control.marshal (Python 3.9)

'''Side-effect-free macOS binding for the shared auto-reply control plane.'''
import time
from typing import Callable, Optional
from WeRobotCore.adapters.control import AutoReplyContactFacts, ExplicitPathAutoReplyConfiguration, ExplicitPathAutoReplyControlState, MonitorRuntimeAutoReplyAccountInventory
from WeRobotCore.adapters.contact_storage import ExplicitPathContactStore
from WeRobotCore.adapters.platform.macos_native import MACOS_ACCESSIBILITY_PERMISSION, MACOS_SCREEN_RECORDING_PERMISSION, MACOS_WECHAT_APP_DATA_PERMISSION, MacOSAppPaths
from WeRobotCore.adapters.history_storage import ExplicitPathChatHistoryStoreFactory
from WeRobotCore.adapters.auto_reply import MacOSTextAutoReplyFeatureValidator
from WeRobotCore.application.auto_reply import AutoReplyControlService, AutoReplyDesiredStateStore, AutoReplyMonitorController, AutoReplyRuntimeReporter, AutoReplyRuntimeConfiguration, AutoReplyRuntimeConfigurationFactory, AutoReplyTaskHistoryStoreFactory
from WeRobotCore.application.auto_reply.config_readiness import AutoReplyConfigurationFacade, ConfiguredAutoReplyReadinessProvider, PrivateAgentCapabilityProbe
from macos import MacOSRuntimeBundle

def create_macos_auto_reply_control_service(*, bundle, config_factory, private_agent_probe, monitor, desired_state, reporter, clock):
    '''Compose shared business rules over the same Mac monitor runtime.

    Construction reads no account, configuration, desired state, Keychain or
    native process.  Those dependencies are invoked only by an explicit
    control request.
    '''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    return AutoReplyControlService(MonitorRuntimeAutoReplyAccountInventory(bundle.monitor_runtime), ConfiguredAutoReplyReadinessProvider(config_factory, private_agent_probe, clock, MacOSTextAutoReplyFeatureValidator(bundle.capability_catalog), **('config_factory', 'private_agent_probe', 'clock', 'runtime_feature_validator')), monitor, desired_state, reporter, bundle.runtime.platform_services.permissions, (MACOS_ACCESSIBILITY_PERMISSION, MACOS_SCREEN_RECORDING_PERMISSION, MACOS_WECHAT_APP_DATA_PERMISSION), **('account_inventory', 'readiness_provider', 'monitor', 'desired_state', 'reporter', 'start_permissions', 'required_start_permissions'))


def create_macos_auto_reply_control_state(paths = None):
    '''Bind AutoReply state to standard Mac product roots without I/O.'''
    if not isinstance(paths, MacOSAppPaths):
        raise TypeError('paths must be MacOSAppPaths')
    return ExplicitPathAutoReplyControlState(paths.data_root / 'runtime', paths.log_root, **('runtime_root', 'log_root'))


class MacOSAutoReplyRuntimeConfigurationFactory:
    '''One explicit-root factory shared by readiness, Monitor and tasks.'''
    
    def __init__(self = None, *, paths, agent_secret_resolver, contact_facts):
        if not isinstance(paths, MacOSAppPaths):
            raise TypeError('paths must be MacOSAppPaths')
        if not callable(agent_secret_resolver):
            raise TypeError('agent_secret_resolver must be callable')
        if not contact_facts is not None and isinstance(contact_facts, AutoReplyContactFacts):
            raise TypeError('contact_facts must implement AutoReplyContactFacts')
        self._paths = paths
        self._agent_secret_resolver = agent_secret_resolver
        self._contact_facts = contact_facts

    
    def __call__(self = None, account_id = None):
        return ExplicitPathAutoReplyConfiguration(self._paths.config_root, account_id, self._agent_secret_resolver, self._contact_facts, **('config_root', 'account_id', 'agent_secret_resolver', 'contact_facts'))

    
    def for_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise ValueError('account_id must be a non-empty string')
        return self(account_id)

    
    def global_configuration(self = None):
        return self(None)



def create_macos_auto_reply_config_factory(*, paths, agent_secret_resolver, contact_facts):
    '''Create the read-only runtime Config factory without reading a file.'''
    return MacOSAutoReplyRuntimeConfigurationFactory(paths, agent_secret_resolver, contact_facts, **('paths', 'agent_secret_resolver', 'contact_facts'))


def create_macos_auto_reply_history_factory(*, paths):
    '''Bind mature history schema to the explicit Mac data root without I/O.'''
    if not isinstance(paths, MacOSAppPaths):
        raise TypeError('paths must be MacOSAppPaths')
    return ExplicitPathChatHistoryStoreFactory(paths.data_root / 'chat_history', **('history_root',))


def create_macos_contact_store(*, paths):
    '''Bind contact sync and AutoReply facts to one explicit Mac database.'''
    if not isinstance(paths, MacOSAppPaths):
        raise TypeError('paths must be MacOSAppPaths')
    return ExplicitPathContactStore(paths.data_root / 'wechat_contacts.db')

__all__ = [
    'create_macos_auto_reply_control_service',
    'create_macos_auto_reply_control_state',
    'create_macos_auto_reply_config_factory',
    'create_macos_auto_reply_history_factory',
    'create_macos_contact_store',
    'MacOSAutoReplyRuntimeConfigurationFactory']
