# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: monitor_session_source.marshal (Python 3.9)

'''Monitor session input backed by the mature Windows chat facade.'''
from typing import Iterable, Mapping, Optional, Sequence, cast
from WeRobotCore.application.monitoring import MonitorSessionBatch, MonitorSessionBatchBinder, MonitorSessionItem, MonitorSessionPayload
from facades import LegacyConversationFacade
from mappers import map_legacy_session

def map_legacy_monitor_session_batch(raw_sessions = None, account_id = None):
    '''Create normalized facts and a lossless top-level Legacy projection.

    This mapper is intentionally not used by ``list_sessions`` yet.  The
    existing production monitor continues to receive the original list until
    its decision and compatibility consumers are migrated in a later batch.
    '''
    normalized_account_id = '' if account_id is None else str(account_id).strip()
    if not normalized_account_id:
        raise ValueError('account_id must be a non-empty string')
    items = None((lambda .0 = None: for raw in .0:
MonitorSessionItem(map_legacy_session(raw, normalized_account_id), raw, **('summary', 'compatibility_payload')))(raw_sessions))
    return MonitorSessionBatch(normalized_account_id, items, **('account_id', 'items'))


class WindowsLegacyMonitorSessionSource:
    '''Delegate the monitor scan without copying any Windows UIA logic.

    ``list_sessions`` retains the original raw-result helper for compatibility.
    The production ``list_session_batch`` reads through that same helper once,
    then creates normalized facts plus the lossless compatibility projection.
    '''
    
    def __init__(self = None, chat = None, batch_binder = None):
        if chat is None:
            raise ValueError('chat must be provided')
        if not batch_binder is not None and isinstance(batch_binder, MonitorSessionBatchBinder):
            raise TypeError('batch_binder must implement MonitorSessionBatchBinder')
        self._chat = chat
        self._batch_binder = batch_binder

    
    async def list_sessions(self = None, account_id = None, limit = None, start_time = (20, None)):
        await self._chat.async_get_latest_sessions(limit, start_time, account_id, **('limit', 'start_time', 'account_id'))
        sessions = <NODE:28>
        return cast(Sequence[MonitorSessionPayload], sessions)

    
    async def list_session_batch(self = None, account_id = None, limit = None, start_time = (20, None)):
        '''Read once from the Legacy facade and map both batch channels.'''
        await self.list_sessions(account_id, limit, start_time, **('account_id', 'limit', 'start_time'))
        sessions = <NODE:28>
        if not sessions:
            pass
        batch = map_legacy_monitor_session_batch((), account_id)
        if self._batch_binder is not None:
            await self._batch_binder.bind_session_batch(batch)
        return batch


