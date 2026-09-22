# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS product projections owned specifically by the Control Host.'''
from WeRobotCore.adapters.wechat.macos_ax import create_macos_instance_version_facts, project_macos_legacy_active_instances_response, project_macos_legacy_agent_instances_status, project_macos_legacy_all_instances_response
from WeRobotCore.bootstrap.macos import MacOSRuntimeBundle
from WeRobotCore.route_packs.instance_inventory import InstanceInventoryRouteBindings

def create_macos_instance_inventory_route_bindings(bundle = None):
    '''Publish real Mac inventory reads without exposing native sidecars.'''
    if not isinstance(bundle, MacOSRuntimeBundle):
        raise TypeError('bundle must be MacOSRuntimeBundle')
    return None((lambda : bundle.inventory), create_macos_instance_version_facts, project_macos_legacy_agent_instances_status, project_macos_legacy_all_instances_response, project_macos_legacy_active_instances_response, **('source_provider', 'version_facts_provider', 'agent_status_projector', 'all_instances_projector', 'active_instances_projector'))

__all__ = [
    'create_macos_instance_inventory_route_bindings']
