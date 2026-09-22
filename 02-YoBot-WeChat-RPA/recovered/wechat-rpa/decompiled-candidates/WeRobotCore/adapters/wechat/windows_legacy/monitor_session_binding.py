# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: monitor_session_binding.marshal (Python 3.9)

'''Bind a normalized monitor batch to the Windows Legacy runtime catalog.'''
from WeRobotCore.application.monitoring import MonitorSessionBatch
from WeRobotCore.domain import AutomationError, ErrorCode, InstanceState
from WeRobotCore.ports.wechat import InstanceRegistry
from bindings import LegacySessionIndex

class WindowsLegacyMonitorSessionBatchBinder:
    '''Index one existing monitor read without performing another UI scan.'''
    
    def __init__(self = None, instances = None, session_index = None):
        if instances is None or session_index is None:
            raise ValueError('instances and session_index must be provided')
        if not isinstance(instances, InstanceRegistry):
            raise TypeError('instances must implement InstanceRegistry')
        self._instances = instances
        self._session_index = session_index

    
    async def bind_session_batch(self = None, batch = None):
        if not isinstance(batch, MonitorSessionBatch):
            raise TypeError('batch must be a MonitorSessionBatch')
    # WARNING: Decompyle incomplete


