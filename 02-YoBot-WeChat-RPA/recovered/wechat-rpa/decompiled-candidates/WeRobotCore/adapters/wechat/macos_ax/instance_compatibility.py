# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_compatibility.marshal (Python 3.9)

'''Mac cleanup for the frozen Legacy instance HTTP read shapes.'''
from typing import Any, Mapping
from WeRobotCore.application.instances import InstanceInventorySnapshot
from WeRobotCore.domain import InstanceState

def _require_snapshot(snapshot = None):
    if not isinstance(snapshot, InstanceInventorySnapshot):
        raise TypeError('snapshot must be an InstanceInventorySnapshot')


def _is_initialized(item = None):
    return item.instance.state is InstanceState.READY


def project_macos_legacy_agent_instances_status(snapshot = None):
    '''Project only the fields consumed by YokoAgent service discovery.'''
    _require_snapshot(snapshot)
    return (lambda .0: [ {
'_initialized': _is_initialized(item),
'account_info': {
'nickname': item.instance.nickname,
'account_id': item.instance.account_id } } for item in .0 ])(snapshot.items)


def project_macos_legacy_all_instances_response(snapshot = None, *, version_facts):
    '''Project the UI compatibility fields without exposing PID or AX facts.'''
    _require_snapshot(snapshot)
    if not isinstance(version_facts, Mapping):
        raise TypeError('version_facts must be a mapping')
    instances = []
    for item in snapshot.items:
        facts = version_facts.get(item.instance.instance_id.value, { })
        if not isinstance(facts, Mapping):
            raise TypeError('each version fact must be a mapping')
        instances.append({
            'instance_id': item.instance.instance_id.value,
            'initialized': _is_initialized(item),
            'is_connected': item.instance.state not in (InstanceState.OFFLINE, InstanceState.ERROR),
            'is_active': item.is_active,
            'manually_exited': False,
            'account_info': {
                'nickname': item.instance.nickname,
                'account_id': item.instance.account_id },
            'wechat_build': list(facts.get('wechat_build')) if facts.get('wechat_build') else None,
            'wechat_version': facts.get('wechat_version') })
    return {
        'success': True,
        'instances': instances }


def project_macos_legacy_active_instances_response(snapshot = None):
    '''Return only verified, attached Mac accounts for Agent account choice.'''
    _require_snapshot(snapshot)
    instances = []
    for item in snapshot.items:
        instance = item.instance
        if not instance.state is not InstanceState.READY and instance.nickname or instance.account_id:
            continue
        instances.append({
            'instance_id': instance.instance_id.value,
            'nickname': instance.nickname,
            'account_id': instance.account_id,
            'is_active': item.is_active })
    return {
        'success': True,
        'instances': instances }


def create_macos_instance_version_facts(snapshot = None):
    '''Keep the frozen fields explicit until Helper exposes verified version.'''
    _require_snapshot(snapshot)
    return (lambda .0: pass# WARNING: Decompyle incomplete
)(snapshot.items)

__all__ = [
    'create_macos_instance_version_facts',
    'project_macos_legacy_active_instances_response',
    'project_macos_legacy_agent_instances_status',
    'project_macos_legacy_all_instances_response']
