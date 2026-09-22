# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_inventory.marshal (Python 3.9)

'''Legacy-compatible instance inventory routes over shared inventory facts.

The Route Pack owns HTTP semantics only.  Native discovery, compatibility
shape cleanup and client-version enrichment are all explicit injected
dependencies, allowing Windows UIA and macOS AX to publish the same external
paths without sharing native implementation details.
'''
from __future__ import annotations
from dataclasses import dataclass
import logging
from typing import Any, Callable, Mapping, Optional
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from WeRobotCore.application.instances import InstanceInventorySnapshot, InstanceInventorySource
InventorySourceProvider = Callable[([], InstanceInventorySource)]
VersionFactsProvider = Callable[([
    InstanceInventorySnapshot], Mapping[(str, Mapping[(str, Any)])])]
AgentStatusProjector = Callable[([
    InstanceInventorySnapshot], Any)]
AllInstancesProjector = Callable[(..., Any)]
ActiveInstancesProjector = Callable[([
    InstanceInventorySnapshot], Any)]
_logger = logging.getLogger(__name__)
InstanceInventoryRouteBindings = dataclass(True, **('frozen',))(<NODE:12>)

async def _snapshot(bindings = None):
    source = bindings.source_provider()
    if not isinstance(source, InstanceInventorySource):
        raise TypeError('source_provider must return InstanceInventorySource')
    await source.snapshot()
    snapshot = <NODE:28>
    if not isinstance(snapshot, InstanceInventorySnapshot):
        raise TypeError('inventory source returned an invalid snapshot')
    return snapshot


def create_instance_inventory_router(*, bindings, auth_dependency, protect_agent_status):
    '''Create the three frozen Legacy instance read routes.'''
    if not isinstance(bindings, InstanceInventoryRouteBindings):
        raise TypeError('bindings must be InstanceInventoryRouteBindings')
    if not callable(auth_dependency):
        raise TypeError('auth_dependency must be callable')
    if not isinstance(protect_agent_status, bool):
        raise TypeError('protect_agent_status must be a boolean')
    router = APIRouter()
    agent_dependencies = [
        Security(auth_dependency)] if protect_agent_status else None
    
    async def get_agent_instances_status():
        pass
    # WARNING: Decompyle incomplete

    get_agent_instances_status = None(get_agent_instances_status)
    
    async def get_all_instances(_api_key = None):
        pass
    # WARNING: Decompyle incomplete

    get_all_instances = None(get_all_instances)
    
    async def get_active_instances(_api_key = None):
        pass
    # WARNING: Decompyle incomplete

    get_active_instances = None(get_active_instances)
    return router

__all__ = [
    'InstanceInventoryRouteBindings',
    'create_instance_inventory_router']
