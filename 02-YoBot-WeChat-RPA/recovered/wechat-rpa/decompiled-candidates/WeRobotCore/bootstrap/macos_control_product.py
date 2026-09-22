# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_control_product.marshal (Python 3.9)

'''Process-owned, still-default-off macOS Control product composition.

This owner joins the shared managers with explicit macOS storage and one
signed product graph.  It exposes the two callbacks consumed by
``prepare_macos_control_runtime`` but never reads secrets, starts the Helper,
opens a socket, or selects a capability release wave by itself.
'''
from __future__ import annotations
from pathlib import Path
from typing import Callable, Iterable, Mapping, Optional, Sequence
from WeRobotCore.adapters.platform import MacKeychainBackend, MacOSApplicationFacade, MacOSAppPaths, MacOSInstalledApplicationResolver, MacOSProcessFacade
from WeRobotCore.adapters.wechat.macos_ax import MacOSNativeHelperBackend
from WeRobotCore.application.auto_reply import AutoReplyControlService, AutoReplyManagerBindingTarget, AutoReplyMonitorBindingTarget
from WeRobotCore.application.auto_reply.config_readiness import PrivateAgentCapabilityProbe
from WeRobotCore.application.product_runtime import ProductRuntimeRegistration
from WeRobotCore.application.runtime import RuntimeCapabilityCatalog
from WeRobotCore.application.startup import StartupWorkflowRegistration
from macos_capabilities import create_macos_mvp_capability_catalog
from macos_control import create_macos_auto_reply_config_factory, create_macos_auto_reply_control_service, create_macos_auto_reply_control_state, create_macos_auto_reply_history_factory, create_macos_contact_store
from macos_product import MacOSProductCompositionCandidate, create_macos_product_composition_candidate
from macos_product_startup import MacOSProductStartupPublication, MacOSProductStartupRegistration

class MacOSControlProductOwner:
    '''Own exactly one closed-Capability product publication per process.'''
    
    def __init__(self = None, *, control_bundle_path, runtime_helper_bundle_path, home_dir, auto_reply_manager, multi_chat_monitor, private_agent_probe, mass_sending_manager, auto_follow_manager, moment_comment_manager, moment_post_manager, add_friend_manager, friend_request_manager, sync_contacts_manager, application_paths, application_resolver, secret_backend, process_facade, application_facade, native_backend, architecture, python_search_paths, user_site_path, experimental_capabilities):
        if not isinstance(control_bundle_path, Path):
            raise TypeError('control_bundle_path must be a pathlib.Path')
        if not isinstance(home_dir, Path) or home_dir.is_absolute():
            raise ValueError('home_dir must be an absolute pathlib.Path')
        if not isinstance(auto_reply_manager, AutoReplyManagerBindingTarget):
            raise TypeError('auto_reply_manager must implement AutoReplyManagerBindingTarget')
        if not isinstance(multi_chat_monitor, AutoReplyMonitorBindingTarget):
            raise TypeError('multi_chat_monitor must implement AutoReplyMonitorBindingTarget')
        if not callable(private_agent_probe):
            raise TypeError('private_agent_probe must be callable')
        if not mass_sending_manager is not None and callable(getattr(mass_sending_manager, 'bind_runtime', None)):
            raise TypeError('mass_sending_manager must expose bind_runtime()')
        if not auto_follow_manager is not None and callable(getattr(auto_follow_manager, 'bind_runtime', None)):
            raise TypeError('auto_follow_manager must expose bind_runtime()')
        if not moment_comment_manager is not None and callable(getattr(moment_comment_manager, 'bind_runtime', None)):
            raise TypeError('moment_comment_manager must expose bind_runtime()')
        if not moment_post_manager is not None and callable(getattr(moment_post_manager, 'bind_runtime', None)):
            raise TypeError('moment_post_manager must expose bind_runtime()')
        if add_friend_manager is not None:
            for method in ('bind_runtime', 'bind_configuration_factory'):
                if not callable(getattr(add_friend_manager, method, None)):
                    raise TypeError('add_friend_manager must expose {}()'.format(method))
        if friend_request_manager is not None:
            for method in ('bind_runtime', 'bind_configuration_factory'):
                if not callable(getattr(friend_request_manager, method, None)):
                    raise TypeError('friend_request_manager must expose {}()'.format(method))
        if not sync_contacts_manager is not None and callable(getattr(sync_contacts_manager, 'bind_runtime', None)):
            raise TypeError('sync_contacts_manager must expose bind_runtime()')
        self._control_bundle_path = control_bundle_path
        self._runtime_helper_bundle_path = runtime_helper_bundle_path
        self._home_dir = home_dir
        self._paths = MacOSAppPaths.from_home(home_dir)
        self._auto_reply_manager = auto_reply_manager
        self._multi_chat_monitor = multi_chat_monitor
        self._private_agent_probe = private_agent_probe
        self._mass_sending_manager = mass_sending_manager
        self._auto_follow_manager = auto_follow_manager
        self._moment_comment_manager = moment_comment_manager
        self._moment_post_manager = moment_post_manager
        self._add_friend_manager = add_friend_manager
        self._friend_request_manager = friend_request_manager
        self._sync_contacts_manager = sync_contacts_manager
        self._application_paths = application_paths
        self._application_resolver = application_resolver
        self._secret_backend = secret_backend
        self._process_facade = process_facade
        self._application_facade = application_facade
        self._native_backend = native_backend
        self._architecture = architecture
        self._python_search_paths = python_search_paths
        self._user_site_path = user_site_path
        self._capability_catalog = create_macos_mvp_capability_catalog(experimental_capabilities)
        self._contact_store = create_macos_contact_store(self._paths, **('paths',))
        self._control_state = create_macos_auto_reply_control_state(self._paths)
        self._history_factory = create_macos_auto_reply_history_factory(self._paths, **('paths',))
        self._product_registration = ProductRuntimeRegistration()
        self._startup_registration = StartupWorkflowRegistration()
        self._publication_registration = MacOSProductStartupRegistration()
        self._publication = None
        self._secret_resolver = None
        self._configuration_factory = None

    
    def paths(self = None):
        return self._paths

    paths = None(paths)
    
    def capability_catalog(self = None):
        return self._capability_catalog

    capability_catalog = None(capability_catalog)
    
    def contact_store(self):
        return self._contact_store

    contact_store = property(contact_store)
    
    def configuration_factory(self):
        return self._configuration_factory

    configuration_factory = property(configuration_factory)
    
    def auto_reply_manager(self = None):
        return self._auto_reply_manager

    auto_reply_manager = None(auto_reply_manager)
    
    def multi_chat_monitor(self = None):
        return self._multi_chat_monitor

    multi_chat_monitor = None(multi_chat_monitor)
    
    def private_agent_probe(self = None):
        return self._private_agent_probe

    private_agent_probe = None(private_agent_probe)
    
    def control_state(self):
        return self._control_state

    control_state = property(control_state)
    
    def history_factory(self):
        '''Expose the same explicit-root store used by AutoReply writes.'''
        return self._history_factory

    history_factory = property(history_factory)
    
    def publication(self = None):
        return self._publication

    publication = None(publication)
    
    def _configuration_for(self, resolver):
        if self._configuration_factory is None:
            self._configuration_factory = create_macos_auto_reply_config_factory(self._paths, resolver, self._contact_store, **('paths', 'agent_secret_resolver', 'contact_facts'))
        return self._configuration_factory

    
    def _candidate(self = None, resolver = None):
        configuration_factory = self._configuration_for(resolver)
        return None(None, None, None, None, None, (lambda _account_id = None: self._contact_store), self._capability_catalog, self._home_dir, self._secret_backend, self._process_facade, self._application_facade, self._native_backend, self._architecture, self._python_search_paths, self._user_site_path, configuration_factory, self._history_factory, self._contact_store.is_group_chat, **('control_bundle_path', 'runtime_helper_bundle_path', 'application_paths', 'application_resolver', 'history_store_factory', 'contact_store_factory', 'capability_catalog', 'home_dir', 'secret_backend', 'process_facade', 'application_facade', 'native_backend', 'architecture', 'python_search_paths', 'user_site_path', 'auto_reply_configuration_factory', 'auto_reply_task_history_factory', 'monitor_group_chat_lookup'))

    
    def publication_factory(self = None, secret_resolver = None):
        if not callable(secret_resolver):
            raise TypeError('secret_resolver must be callable')
        if self._publication is not None:
            if secret_resolver is not self._secret_resolver:
                raise RuntimeError('macOS product is bound to another secret snapshot')
            return self._publication
        self._secret_resolver = None
        publication = None(None, None, None, (lambda : self._candidate(secret_resolver)), self._auto_reply_manager, self._multi_chat_monitor, **('product_registration', 'startup_registration', 'composition_factory', 'auto_reply_manager', 'multi_chat_monitor'))
        if not isinstance(publication, MacOSProductStartupPublication):
            raise RuntimeError('macOS product publication was not created')
        if self._mass_sending_manager is not None and self._auto_follow_manager is not None and self._moment_comment_manager is not None and self._moment_post_manager is not None and self._add_friend_manager is not None and self._friend_request_manager is not None or self._sync_contacts_manager is not None:
            MacOSMassSendingRuntime = MacOSMassSendingRuntime
            import WeRobotCore.adapters.mass_sending
            bundle = publication.composition.runtime_bundle
            greeting_sender = bundle.greeting_sender
            if greeting_sender is None:
                raise RuntimeError('macOS runtime has no greeting message sender')
            outbound_runtime = MacOSMassSendingRuntime(bundle.gateway, bundle.driver, self._contact_store, self._configuration_factory, greeting_sender, **('gateway', 'driver', 'contact_store', 'configuration_factory', 'message_sender'))
            if self._mass_sending_manager is not None:
                self._mass_sending_manager.bind_runtime(outbound_runtime)
            if self._auto_follow_manager is not None:
                MacOSAutoFollowRuntime = MacOSAutoFollowRuntime
                import WeRobotCore.adapters.auto_follow
                AutomationContextAutoReplyHistoryRecorder = AutomationContextAutoReplyHistoryRecorder
                import WeRobotCore.application.auto_reply
                self._auto_follow_manager.bind_runtime(MacOSAutoFollowRuntime(outbound_runtime, self._contact_store, bundle.auto_reply_conversations, AutomationContextAutoReplyHistoryRecorder(bundle.gateway, self._history_factory), self._history_factory, self._auto_reply_manager, self._paths.data_root / 'file_library', **('outbound_runtime', 'contact_store', 'conversation_reader', 'history_recorder', 'history_factory', 'auto_reply_manager', 'file_library_root')))
            if self._moment_comment_manager is not None:
                MacOSMomentCommentRuntime = MacOSMomentCommentRuntime
                import WeRobotCore.adapters.moments
                self._moment_comment_manager.bind_runtime(MacOSMomentCommentRuntime(bundle.gateway, bundle.driver, self._contact_store, self._configuration_factory, self._paths.data_root / 'moments', **('gateway', 'driver', 'contact_store', 'configuration_factory', 'state_root')))
            if self._moment_post_manager is not None:
                MacOSMomentPostRuntime = MacOSMomentPostRuntime
                import WeRobotCore.adapters.moments
                self._moment_post_manager.bind_runtime(MacOSMomentPostRuntime(bundle.gateway, bundle.driver, **('gateway', 'driver')))
            if self._add_friend_manager is not None:
                MacOSAddFriendRuntime = MacOSAddFriendRuntime
                import WeRobotCore.adapters.add_friend
                self._add_friend_manager.bind_runtime(MacOSAddFriendRuntime(bundle.gateway, bundle.driver, **('gateway', 'driver')))
                self._add_friend_manager.bind_configuration_factory(self._configuration_factory)
            if self._friend_request_manager is not None:
                MacOSFriendRequestRuntime = MacOSFriendRequestRuntime
                import WeRobotCore.adapters.friend_request
                self._friend_request_manager.bind_runtime(MacOSFriendRequestRuntime(bundle.gateway, bundle.driver, outbound_runtime, **('gateway', 'driver', 'outbound_runtime')))
                self._friend_request_manager.bind_configuration_factory(self._configuration_factory)
            if self._sync_contacts_manager is not None:
                MacOSScheduledContactSyncRuntime = MacOSScheduledContactSyncRuntime
                import WeRobotCore.adapters.contact_sync
                ExplicitPathAutoReplyConfigurationStore = ExplicitPathAutoReplyConfigurationStore
                import WeRobotCore.adapters.control
                self._sync_contacts_manager.bind_runtime(MacOSScheduledContactSyncRuntime(bundle.gateway, publication.composition.contact_sync, ExplicitPathAutoReplyConfigurationStore(self._paths.config_root), self._multi_chat_monitor, **('gateway', 'sync_service', 'config_store', 'monitor')))
        self._publication = publication
        return publication

    
    def auto_reply_service_factory_builder(self = None, secret_resolver = None):
        if self._publication is None or self._configuration_factory is None:
            raise RuntimeError('macOS product must be published before its service')
        if secret_resolver is not self._secret_resolver:
            raise RuntimeError('auto reply service received another secret snapshot')
        expected_bundle = self._publication.composition.runtime_bundle
        
        def create_service(bundle = None):
            if bundle is not expected_bundle:
                raise ValueError('auto reply service received another runtime bundle')
            return create_macos_auto_reply_control_service(bundle, self._configuration_factory, self._private_agent_probe, self._multi_chat_monitor, self._control_state, self._control_state, **('bundle', 'config_factory', 'private_agent_probe', 'monitor', 'desired_state', 'reporter'))

        return create_service


__all__ = [
    'MacOSControlProductOwner']
