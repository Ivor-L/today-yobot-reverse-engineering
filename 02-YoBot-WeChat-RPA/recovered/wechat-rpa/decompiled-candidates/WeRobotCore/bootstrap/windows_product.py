# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_product.marshal (Python 3.9)

'''Explicit, default-policy-free Windows product runtime registration.'''
from typing import Callable, Optional
from WeRobotCore.application.auto_reply import AutoReplyManagerBindingTarget, AutoReplyMonitorBindingTarget, AutoReplyHistoryStore
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate, ProductRuntimeRegistration
from WeRobotCore.application.runtime import PlatformServices, RuntimeCapabilityCatalog
from windows_legacy import LegacyChatFacade, LegacyContactDatabase, LegacyInstanceManagerFacade, bind_existing_windows_legacy_dependencies, create_windows_product_runtime_candidate

def register_existing_windows_product_runtime(*, enabled, registration, manager, chat, contact_database_factory, platform_services, history_store_factory, capability_catalog, app_version, architecture, auto_reply_manager, multi_chat_monitor):
    '''Register the existing Windows graph without importing its entry point.

    ``enabled`` is deliberately supplied by the caller.  When false, the
    candidate closure is never evaluated, so no Legacy dependency, database,
    storage or platform service is touched.
    '''
    if not isinstance(registration, ProductRuntimeRegistration):
        raise TypeError('registration must be ProductRuntimeRegistration')
    
    def create_candidate():
        bundle = bind_existing_windows_legacy_dependencies(manager, chat, contact_database_factory, platform_services, **('manager', 'chat', 'contact_database_factory', 'platform_services'))
        return create_windows_product_runtime_candidate(bundle, history_store_factory, capability_catalog, app_version, architecture, **('bundle', 'history_store_factory', 'capability_catalog', 'app_version', 'architecture'))

    return registration.register_if_enabled(enabled, create_candidate, auto_reply_manager, multi_chat_monitor, **('candidate_factory', 'auto_reply_manager', 'multi_chat_monitor'))

