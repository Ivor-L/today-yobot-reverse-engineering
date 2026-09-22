# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime.marshal (Python 3.9)

'''Control-plane account inventory over shared monitor runtime facts.'''
from WeRobotCore.application.auto_reply import AutoReplyAccount
from WeRobotCore.application.monitoring import MonitorAccount, MonitorRuntimeSource

class MonitorRuntimeAutoReplyAccountInventory:
    '''Map one Driver/runtime account snapshot into control-plane identities.

    The source already owns platform health checks.  This adapter does not
    discover instances, attach accounts, inspect native UI or mutate monitor
    state while a user asks to start automatic replies.
    '''
    
    def __init__(self = None, source = None):
        if not isinstance(source, MonitorRuntimeSource):
            raise TypeError('source must implement MonitorRuntimeSource')
        self._source = source

    
    async def list_valid_accounts(self):
        await self._source.list_ready_accounts()
        accounts = <NODE:28>
        if isinstance(accounts, (str, bytes)):
            raise TypeError('monitor runtime accounts must be a sequence')
    # WARNING: Decompyle incomplete


__all__ = [
    'MonitorRuntimeAutoReplyAccountInventory']
