# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: fake.marshal (Python 3.9)

'''Deterministic in-memory WeChat driver for application contract tests.'''
import hashlib
from dataclasses import replace
from datetime import datetime, timezone
from typing import Callable, Dict, Iterable, List, Mapping, Optional, Sequence
from WeRobotCore.domain import AccountInstance, AutomationError, CapabilityName, CapabilityState, CapabilityStatus, ChatType, ConversationReadResult, ContactRecord, ErrorCode, GroupRecord, InstanceId, InstanceState, MentionState, MessageContentType, MessageDirection, MessageRecord, OperationResult, SessionSummary
from WeRobotCore.ports.wechat import NativeInstanceRef

class FakeWeChatDriver:
    '''One fake account implementing all initial WeChat ports in memory.'''
    
    def __init__(self, account_id, nickname, sessions, messages, contacts = None, groups = None, native_key = None, process_id = ((), None, (), (), 'fake-wechat-001', 1001, None), clock = {
        'account_id': str,
        'nickname': str,
        'sessions': Iterable[SessionSummary],
        'messages': Optional[Mapping[(str, Iterable[MessageRecord])]],
        'contacts': Iterable[ContactRecord],
        'groups': Iterable[GroupRecord],
        'native_key': str,
        'process_id': int,
        'clock': Optional[Callable[([], datetime)]],
        'return': None }):
        if not account_id or nickname:
            raise ValueError('account_id and nickname must be non-empty')
        self.account_id = account_id
        self.nickname = nickname
        self.instance_id = InstanceId('fake-instance-{}'.format(account_id))
        self.native_ref = NativeInstanceRef('fake', native_key, process_id, **('platform', 'native_key', 'process_id'))
        if not clock:
            pass
        
        self._clock = lambda : datetime.now(timezone.utc)
        self._attached = False
        self._message_sequence = 0
        self._sessions = { }
        self._session_order = []
        self._messages = { }
        self._contacts = tuple(contacts)
        self._groups = tuple(groups)
        for session in sessions:
            self._seed_session(session)
        if not messages:
            pass
        for session_id, records in { }.items():
            if session_id not in self._sessions:
                raise ValueError('messages reference unknown session: {}'.format(session_id))
            self._messages[session_id] = list(records)
        self._capabilities = self._build_capabilities()

    
    def _build_capabilities():
        supported = (CapabilityName.INSTANCE_ATTACH, CapabilityName.ACCOUNT_READ_CURRENT, CapabilityName.CONVERSATION_LIST, CapabilityName.CONVERSATION_READ, CapabilityName.MESSAGE_SEND_TEXT, CapabilityName.CONTACT_LIST, CapabilityName.GROUP_LIST)
        states = (lambda .0: pass# WARNING: Decompyle incomplete
)(supported)
        for item in (CapabilityName.MESSAGE_SEND_IMAGE, CapabilityName.MESSAGE_SEND_FILE):
            states[item.value] = CapabilityState(item.value, CapabilityStatus.UNAVAILABLE, 'FAKE_CAPABILITY_NOT_IMPLEMENTED', **('name', 'status', 'reason_code'))
        return states

    _build_capabilities = None(_build_capabilities)
    
    def _seed_session(self = None, session = None):
        if session.account_id != self.account_id:
            raise ValueError('session belongs to another account')
        if session.session_id not in self._sessions:
            self._session_order.append(session.session_id)
        self._sessions[session.session_id] = session
        self._messages.setdefault(session.session_id, [])

    
    def _require_instance(self = None, instance_id = None):
        if instance_id != self.instance_id:
            raise AutomationError(ErrorCode.INSTANCE_NOT_FOUND, 'unknown fake instance: {}'.format(instance_id))
        if not self._attached:
            raise AutomationError(ErrorCode.INSTANCE_NOT_READY, 'fake instance is not attached')

    
    def _instance(self = None):
        return AccountInstance(self.instance_id, self.account_id, self.nickname, InstanceState.READY, 'fake.memory.v1', dict(self._capabilities), **('instance_id', 'account_id', 'nickname', 'state', 'driver_id', 'capabilities'))

    
    def _next_message_id(self = None, content = None):
        self._message_sequence += 1
        seed = '{}:{}:{}'.format(self.account_id, self._message_sequence, content)
        digest = hashlib.sha256(seed.encode('utf-8')).hexdigest()[:16]
        return 'fake-message-{}'.format(digest)

    
    def _write_guard(self = None, instance_id = None, session_id = None):
        pass
    # WARNING: Decompyle incomplete

    
    async def discover(self = None):
        return (self.native_ref,)

    
    async def attach(self = None, ref = None):
        if ref.native_key != self.native_ref.native_key:
            raise AutomationError(ErrorCode.INSTANCE_NOT_FOUND, 'native instance was not discovered')
        self._attached = True
        return self._instance()

    
    async def detach(self = None, instance_id = None):
        if instance_id != self.instance_id:
            return OperationResult.failed(ErrorCode.INSTANCE_NOT_FOUND, 'unknown fake instance')
        self._attached = None
        return OperationResult.succeeded('fake instance detached', True, **('verified',))

    
    async def list_attached(self = None):
        if self._attached:
            return (self._instance(),)

    
    async def get_by_account(self = None, account_id = None):
        if self._attached and account_id == self.account_id:
            return self._instance()

    
    async def list_sessions(self = None, instance_id = None, limit = None, start_time = (20, None)):
        self._require_instance(instance_id)
        if limit <= 0:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'session limit must be positive')
        sessions = None((lambda .0 = None: for session_id in .0:
self._sessions[session_id])(self._session_order[:limit]))
        if start_time is None:
            return sessions
        return None((lambda .0 = None: 