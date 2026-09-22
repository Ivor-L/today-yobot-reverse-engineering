# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS execution seam for the shared scheduled directory workflow.'''
from __future__ import annotations
import time
from typing import Any, Callable, Sequence
from WeRobotCore.adapters.control import ExplicitPathAutoReplyConfigurationStore
from WeRobotCore.application.contacts import AutomationContextContactSyncService, ContactSyncOutcome
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.domain import AccountInstance, InstanceState

class MacOSScheduledContactSyncRuntime:
    '''Execute the Windows scheduling contract through the Mac Driver.

    Scheduling, replacement, cancellation and retry cadence remain owned by
    ``SyncContactsAdapter``. This class only supplies the platform operation
    that Windows implements with ``SyncContactsTask`` and UIA.
    '''
    
    def __init__(self = None, *, gateway, sync_service, config_store, monitor, wall_clock):
        if not isinstance(gateway, WeChatAutomationGateway):
            raise TypeError('gateway must be a WeChatAutomationGateway')
        if not isinstance(sync_service, AutomationContextContactSyncService):
            raise TypeError('sync_service must be AutomationContextContactSyncService')
        if not isinstance(config_store, ExplicitPathAutoReplyConfigurationStore):
            raise TypeError('config_store must be ExplicitPathAutoReplyConfigurationStore')
        for method in ('is_running', 'stop_monitoring_all', 'start_monitoring_all'):
            if not callable(getattr(monitor, method, None)):
                raise TypeError('monitor must expose {}()'.format(method))
        if not callable(wall_clock):
            raise TypeError('wall_clock must be callable')
        self._gateway = gateway
        self._sync_service = sync_service
        self._config_store = config_store
        self._monitor = monitor
        self._wall_clock = wall_clock
        self.error = None

    
    async def execute(self = None, task_id = None, sync_items = None):
        if not isinstance(task_id, str) or task_id.strip():
            raise ValueError('task_id must be a non-empty string')
        if isinstance(sync_items, (str, bytes)):
            raise TypeError('sync_items must be a sequence')
        items = tuple(sync_items)
        if items or any((lambda .0: for item in .0:
item not in frozenset({'friend', 'group'}))(items)):
            raise ValueError('sync_items can contain only friend and group')
        self.error = None
        monitor_was_running = bool(self._monitor.is_running())
        if not getattr(self._monitor, '_reply_mode', 'local'):
            pass
        reply_mode = str('local')
        if monitor_was_running:
            await self._monitor.stop_monitoring_all(False, **('user_initiated',))
    # WARNING: Decompyle incomplete


