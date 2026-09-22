# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: agent_runtime_identity.marshal (Python 3.9)

'''Protected Agent ownership route for one already-composed Control.'''
from __future__ import annotations
from typing import Any, Callable, Dict
from fastapi import APIRouter, Security
from WeRobotCore.application.control_runtime_identity import ControlRuntimeIdentity
RuntimeIdentityProvider = Callable[([], ControlRuntimeIdentity)]

def create_agent_runtime_identity_router(*, identity_provider, auth_dependency):
    '''Create the exact route without deriving identity from the request.'''
    if not callable(identity_provider):
        raise TypeError('identity_provider must be callable')
    if not callable(auth_dependency):
        raise TypeError('auth_dependency must be callable')
    router = APIRouter()
    
    async def get_agent_runtime_identity(_api_key = None):
        identity = identity_provider()
        if not isinstance(identity, ControlRuntimeIdentity):
            raise TypeError('identity_provider must return ControlRuntimeIdentity')
        return {
            'success': True,
            'data': identity.to_agent_dict() }

    get_agent_runtime_identity = None(get_agent_runtime_identity)
    return router

__all__ = [
    'RuntimeIdentityProvider',
    'create_agent_runtime_identity_router']
