# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: initialization.marshal (Python 3.9)

'''Shared instance initialization orchestration without native automation.

Platform backends own version checks, permissions, UI operations and native
account binding.  This module owns only result integrity, deterministic
aggregation, the once-per-successful-batch post-init hook, and normalized
reporting.  It intentionally has no FastAPI or HTTP response knowledge.
'''
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional, Protocol, Tuple, runtime_checkable
from WeRobotCore.domain import InstanceId
from inventory import InstanceInventorySnapshot, InstanceInventorySource, freeze_compatibility_value

def _optional_text(value = None, field_name = None):
    if value is None:
        return None
    if not None(value, str):
        raise TypeError('{} must be a string when provided'.format(field_name))
    normalized = value.strip()
    if not normalized:
        pass


def _required_text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    return value.strip()

InstanceInitializationResult = dataclass(True, **('frozen',))(<NODE:12>)
InstanceInitializationBatch = dataclass(True, **('frozen',))(<NODE:12>)
InstanceInitializationOutcome = dataclass(True, **('frozen',))(<NODE:12>)
InstanceInitializationBackend = runtime_checkable(<NODE:12>)
InstanceInitializationPostHook = runtime_checkable(<NODE:12>)
InstanceInitializationReporter = runtime_checkable(<NODE:12>)

class InstanceInitializationService:
    '''Validate and aggregate one initialization request deterministically.'''
    
    def __init__(self = None, *, inventory, backend, post_init, reporter):
        dependencies = (('inventory', inventory, InstanceInventorySource), ('backend', backend, InstanceInitializationBackend), ('post_init', post_init, InstanceInitializationPostHook), ('reporter', reporter, InstanceInitializationReporter))
        for name, dependency, protocol in dependencies:
            if not isinstance(dependency, protocol):
                raise TypeError('{} must implement {}'.format(name, protocol.__name__))
        self._inventory = inventory
        self._backend = backend
        self._post_init = post_init
        self._reporter = reporter

    
    async def initialize(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    def _validate_batch(inventory = None, batch = None):
        if inventory.driver_id != batch.driver_id:
            raise ValueError('initialization batch driver must match inventory')
        expected_ids = tuple((lambda .0: for item in .0:
item.instance.instance_id.value)(inventory.items))
        result_ids = tuple((lambda .0: for item in .0:
item.instance_id.value)(batch.results))
        if result_ids != expected_ids:
            raise ValueError('initialization results must match inventory order and identity')

    _validate_batch = None(_validate_batch)

