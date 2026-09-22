# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: bindings.marshal (Python 3.9)

'''Process-local Windows Legacy bindings that never cross public contracts.'''
from collections import OrderedDict
from typing import Any, Dict, Mapping, Optional, Sequence, Tuple
from WeRobotCore.domain import AccountInstance, AutomationError, ErrorCode, InstanceId, InstanceState, MessageRecord, SessionSummary
from WeRobotCore.ports.wechat import InstanceRegistry

async def require_ready_account(instances = None, instance_id = None):
    '''Resolve one attached account and fail before any Legacy UI action.'''
    if not isinstance(instance_id, InstanceId):
        raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'instance_id must be an InstanceId')
# WARNING: Decompyle incomplete


class LegacySessionIndex:
    '''Map public session ids to Legacy UI names for one process lifetime.'''
    
    def __init__(self = None):
        self._names = { }

    
    def remember(self = None, instance_id = None, sessions = None):
        pending = { }
        for session in sessions:
            key = (instance_id.value, session.session_id)
            previous = pending.get(key)
            if previous is not None and previous != session.name:
                raise AutomationError(ErrorCode.OPERATION_FAILED, 'Legacy session id maps to multiple names: {}'.format(session.session_id))
            pending[key] = session.name
        self._names.update(pending)

    
    def resolve(self = None, instance_id = None, session_id = None):
        return self._names.get((instance_id.value, session_id))

    
    def forget_instance(self = None, instance_id = None):
        prefix = instance_id.value
        self._names = (lambda .0 = None: pass# WARNING: Decompyle incomplete
)(self._names.items())



class LegacyMessageEvidenceStore:
    '''Bounded sidecar for native sender evidence such as ``rect_info``.'''
    
    def __init__(self = None, max_entries = None):
        if max_entries <= 0:
            raise ValueError('max_entries must be positive')
        self._max_entries = max_entries
        self._items = OrderedDict()

    
    def remember(self, instance_id = None, session_id = None, raw_messages = None, messages = {
        'instance_id': InstanceId,
        'session_id': str,
        'raw_messages': Sequence[Mapping[(str, Any)]],
        'messages': Sequence[MessageRecord],
        'return': None }):
