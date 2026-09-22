# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: product_runtime.marshal (Python 3.9)

'''Process-level publication boundary for one platform product runtime.'''
from dataclasses import dataclass
from typing import Callable, Optional
from WeRobotCore.application.auto_reply import AutoReplyManagerBindingTarget, AutoReplyMonitorBindingTarget, AutoReplyRuntimeBindings, install_auto_reply_runtime_bindings
from WeRobotCore.application.runtime import RuntimeContainer, RuntimeProductContract
ProductRuntimeCandidate = dataclass(True, **('frozen',))(<NODE:12>)

class ProductRuntimeRegistration:
    '''Publish one product runtime without owning platform selection policy.

    The production entry point decides whether registration is enabled and
    supplies the platform factory.  Keeping environment/config parsing outside
    this class means Windows and macOS share the same lifecycle rules.
    '''
    
    def __init__(self = None):
        self._candidate = None
        self._owner_ids = None

    
    def current(self = None):
        return self._candidate

    current = None(current)
    
    def is_registered(self = None):
        return self._candidate is not None

    is_registered = None(is_registered)
    
    def register_if_enabled(self = None, enabled = None, *, candidate_factory, auto_reply_manager, multi_chat_monitor):
        '''Build and install once; disabled registration has zero dependencies.'''
        if not isinstance(enabled, bool):
            raise TypeError('enabled must be a boolean')
        owner_ids = None
        if auto_reply_manager is not None and multi_chat_monitor is not None:
            owner_ids = (id(auto_reply_manager), id(multi_chat_monitor))
        if self._candidate is not None:
            if owner_ids != self._owner_ids:
                raise RuntimeError('product runtime is already registered for different owners')
            return self._candidate
        if not None:
            return None
        if not None(candidate_factory):
            raise TypeError('candidate_factory must be callable when enabled')
        if auto_reply_manager is None or multi_chat_monitor is None:
            raise ValueError('auto_reply_manager and multi_chat_monitor are required when enabled')
        candidate = candidate_factory()
        if not isinstance(candidate, ProductRuntimeCandidate):
            raise TypeError('candidate_factory must return ProductRuntimeCandidate')
        install_auto_reply_runtime_bindings(candidate.auto_reply, auto_reply_manager, multi_chat_monitor, **('auto_reply_manager', 'multi_chat_monitor'))
        self._candidate = candidate
        self._owner_ids = owner_ids
        return candidate


