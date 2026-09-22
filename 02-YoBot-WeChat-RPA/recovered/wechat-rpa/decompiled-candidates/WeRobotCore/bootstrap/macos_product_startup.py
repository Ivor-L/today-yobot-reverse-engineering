# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_product_startup.marshal (Python 3.9)

'''Default-off publication of one coherent macOS product/startup graph.'''
from dataclasses import dataclass
from typing import Callable, Optional, Tuple
from WeRobotCore.application.auto_reply import AutoReplyManagerBindingTarget, AutoReplyMonitorBindingTarget
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate, ProductRuntimeRegistration
from WeRobotCore.application.startup import StartupWorkflowRegistration, StartupWorkflowService
from macos_product import MacOSProductCompositionCandidate
from macos_startup import create_macos_startup_workflow
MacOSProductStartupPublication = dataclass(True, **('frozen',))(<NODE:12>)

class MacOSProductStartupRegistration:
    '''Coordinate generic publications without selecting platform implicitly.'''
    
    def __init__(self = None):
        self._publication = None
        self._owner_ids = None

    
    def current(self = None):
        return self._publication

    current = None(current)
    
    def register_if_enabled(self = None, enabled = None, *, product_registration, startup_registration, composition_factory, auto_reply_manager, multi_chat_monitor):
        if not isinstance(enabled, bool):
            raise TypeError('enabled must be a boolean')
        if not isinstance(product_registration, ProductRuntimeRegistration):
            raise TypeError('product_registration must be ProductRuntimeRegistration')
        if not isinstance(startup_registration, StartupWorkflowRegistration):
            raise TypeError('startup_registration must be StartupWorkflowRegistration')
        if self._publication is not None:
            owner_ids = (id(auto_reply_manager), id(multi_chat_monitor))
            if owner_ids != self._owner_ids:
                raise RuntimeError('macOS product is already registered for different owners')
            if product_registration.current is not self._publication.product_runtime or startup_registration.current is not self._publication.startup_workflow:
                raise RuntimeError('macOS product registrations were replaced')
            return self._publication
        if not None:
            return None
        if None.is_registered or startup_registration.is_registered:
            raise RuntimeError('generic product/startup registration is already occupied')
        if not callable(composition_factory):
            raise TypeError('composition_factory must be callable when enabled')
        if auto_reply_manager is None or multi_chat_monitor is None:
            raise ValueError('auto_reply_manager and multi_chat_monitor are required when enabled')
        composition = composition_factory()
        if not isinstance(composition, MacOSProductCompositionCandidate):
            raise TypeError('composition_factory must return MacOSProductCompositionCandidate')
        startup_workflow = create_macos_startup_workflow(composition.runtime_bundle)
        product_runtime = None(None, (lambda : composition.product_runtime), auto_reply_manager, multi_chat_monitor, **('candidate_factory', 'auto_reply_manager', 'multi_chat_monitor'))
        published_startup = None(None, (lambda : startup_workflow), **('service_factory',))
        if product_runtime is not composition.product_runtime:
            raise RuntimeError('unexpected product runtime was published')
        if published_startup is not startup_workflow:
            raise RuntimeError('unexpected Startup workflow was published')
        publication = MacOSProductStartupPublication(composition, product_runtime, published_startup, **('composition', 'product_runtime', 'startup_workflow'))
        self._publication = publication
        self._owner_ids = (id(auto_reply_manager), id(multi_chat_monitor))
        return publication


