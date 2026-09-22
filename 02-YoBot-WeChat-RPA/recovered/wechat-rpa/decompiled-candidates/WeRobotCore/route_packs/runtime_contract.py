# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime_contract.marshal (Python 3.9)

'''Authenticated, additive discovery routes for one published product runtime.

The Route Pack is intentionally independent from ``api_server.py`` and the
legacy ``WeRobotCore.api`` package, whose import graph still includes Windows
native automation modules.  A production composition root supplies both the
existing authentication dependency and a read-only candidate provider.  The
routes never construct or register a runtime and never infer capabilities from
the host operating system.
'''
from __future__ import annotations
from typing import Any, Callable, Dict, Optional
from fastapi import APIRouter, HTTPException, Security, status
from WeRobotCore.application.product_runtime import ProductRuntimeCandidate
PRODUCT_RUNTIME_NOT_REGISTERED = 'PRODUCT_RUNTIME_NOT_REGISTERED'
RUNTIME_CONTRACT_UNAVAILABLE = 'RUNTIME_CONTRACT_UNAVAILABLE'
CandidateProvider = Callable[([], Optional[ProductRuntimeCandidate])]

def _error_detail(code = None, message = None):
    return {
        'code': code,
        'message': message }


def _snapshot(candidate_provider = None):
    '''Read exactly one already-published candidate and one fresh snapshot.'''
    pass
# WARNING: Decompyle incomplete


def create_runtime_contract_router(*, candidate_provider, auth_dependency):
    '''Create the two versioned discovery routes without publishing a runtime.'''
    if not callable(candidate_provider):
        raise TypeError('candidate_provider must be callable')
    if not callable(auth_dependency):
        raise TypeError('auth_dependency must be callable')
    router = APIRouter()
    
    async def get_agent_contract(_api_key = None):
        snapshot = _snapshot(candidate_provider)
        return {
            'success': True,
            'data': dict(snapshot.to_agent_contract_dict()) }

    get_agent_contract = None(get_agent_contract)
    
    async def get_runtime_capabilities(_api_key = None):
        snapshot = _snapshot(candidate_provider)
        return {
            'success': True,
            'data': dict(snapshot.to_runtime_capabilities_dict()) }

    get_runtime_capabilities = None(get_runtime_capabilities)
    return router

__all__ = [
    'PRODUCT_RUNTIME_NOT_REGISTERED',
    'RUNTIME_CONTRACT_UNAVAILABLE',
    'create_runtime_contract_router']
