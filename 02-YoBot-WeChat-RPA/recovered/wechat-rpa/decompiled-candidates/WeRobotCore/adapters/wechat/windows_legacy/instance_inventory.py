# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_inventory.marshal (Python 3.9)

'''Windows Legacy instance inventory adapter and compatibility projectors.

This module performs one existing ``list_instances`` read and pure data-shape
mapping.  It does not initialize/switch WeChat, probe versions, start a
scheduler, or import native Windows modules.  A later route adapter may supply
already-probed version facts to the pure all-instances projector.
'''
from typing import Any, Iterable, Mapping, Optional, Protocol, Sequence
from WeRobotCore.application.instances import InstanceInventoryItem, InstanceInventorySnapshot
from WeRobotCore.application.instances.inventory import thaw_compatibility_value
from WeRobotCore.domain import CapabilityState
from mappers import WINDOWS_LEGACY_DRIVER_ID, map_legacy_instance

class LegacyInstanceInventoryFacade(Protocol):
    '''The only mature Manager operation allowed at the read boundary.'''
    
    def list_instances(self = None):
        pass



def map_legacy_instance_inventory(records = None, *, capabilities, driver_id):
    '''Map one ordered Legacy list while retaining an immutable raw sidecar.'''
    if isinstance(records, (str, bytes, Mapping)):
        raise TypeError('records must be an iterable of mappings')
# WARNING: Decompyle incomplete


def project_legacy_agent_instances_status(snapshot = None):
    '''Reproduce the unauthenticated Agent discovery array.'''
    _require_snapshot(snapshot)
    result = []
    for item in snapshot.items:
        raw = item.compatibility_payload
        account_info = raw.get('account_info')
        account_info = account_info if isinstance(account_info, Mapping) else { }
        result.append({
            '_initialized': raw.get('initialized', False),
            'account_info': {
                'nickname': account_info.get('nickname'),
                'account_id': account_info.get('account_id') } })
    return result


def project_legacy_all_instances_response(snapshot = None, *, version_facts):
    '''Return a detached Legacy response, optionally applying probed versions.

    Version probing stays in the Windows platform adapter.  When facts are
    supplied, every item receives the same two keys as the current Route and a
    missing fact is projected as ``None``.
    '''
    _require_snapshot(snapshot)
    if not version_facts is not None and isinstance(version_facts, Mapping):
        raise TypeError('version_facts must be a mapping when provided')
    instances = []
    for item in snapshot.items:
        raw = thaw_compatibility_value(item.compatibility_payload)
        if version_facts is not None:
            facts = version_facts.get(item.instance.instance_id.value, { })
            if not isinstance(facts, Mapping):
                raise TypeError('each version fact must be a mapping')
            build = facts.get('wechat_build')
            raw['wechat_build'] = list(build) if build else None
            raw['wechat_version'] = facts.get('wechat_version')
        instances.append(raw)
    return {
        'success': True,
        'instances': instances }


def project_legacy_active_instances_response(snapshot = None):
    '''Reproduce Legacy account completeness and manual-exit filtering.'''
    _require_snapshot(snapshot)
    instances = []
    for item in snapshot.items:
        raw = item.compatibility_payload
        if raw.get('manually_exited', False):
            continue
        account_info = raw.get('account_info')
        if not isinstance(account_info, Mapping):
            continue
        nickname = account_info.get('nickname')
        account_id = account_info.get('account_id')
        if not nickname or account_id:
            continue
        instances.append({
            'instance_id': item.instance.instance_id.value,
            'nickname': nickname,
            'account_id': account_id,
            'is_active': raw.get('is_active', False) })
    return {
        'success': True,
        'instances': instances }


def _require_snapshot(snapshot = None):
    if not isinstance(snapshot, InstanceInventorySnapshot):
        raise TypeError('snapshot must be an InstanceInventorySnapshot')


class WindowsLegacyInstanceInventorySource:
    '''Read the mature manager exactly once and expose the dual projection.'''
    
    def __init__(self = None, manager = None, *, capabilities):
        if manager is None:
            raise ValueError('manager must be provided')
        self._manager = manager
        if not capabilities:
            pass
        self._capabilities = dict({ })

    
    async def snapshot(self = None):
        records = self._manager.list_instances()
        return map_legacy_instance_inventory(records, self._capabilities, **('capabilities',))


