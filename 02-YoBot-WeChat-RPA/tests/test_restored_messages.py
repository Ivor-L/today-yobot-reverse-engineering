"""Compare recovered methods with original function code, using a fake host.
Native imports, app startup and real WeChat operations are never executed.
"""
import asyncio
from dataclasses import dataclass, asdict, replace
from pathlib import Path
import marshal
import types
from typing import Mapping
import unittest
from test_restored_ipc import ROOT, capture, original_module
from WeRobotCore.adapters.wechat.macos_ax import message_methods as m
from WeRobotCore.domain import AutomationError, ErrorCode

# Load only two function bodies, not the original driver module initializer.
module_code = marshal.loads((ROOT/'recovered/wechat-rpa/bytecode/WeRobotCore/adapters/wechat/macos_ax/driver.marshal').read_bytes())
class_code = next(c for c in module_code.co_consts if isinstance(c, types.CodeType) and c.co_name=='MacOSAxDriver')
globals_for_original = dict(vars(m), CapabilityName=types.SimpleNamespace(
    MESSAGE_SEND_TEXT=types.SimpleNamespace(value='message.send_text'),
    CONVERSATION_READ=types.SimpleNamespace(value='conversation.read')),
    MacOSHelperAction=types.SimpleNamespace(SEND_TEXT='wechat.message.send_text', READ_CONVERSATION='wechat.conversation.read'))
oracles = {name: types.FunctionType(next(c for c in class_code.co_consts
    if isinstance(c,types.CodeType) and c.co_name==name),globals_for_original)
    for name in ['send_text','read_messages']}
# Defaults belong to the parent definition and were verified in its bytecode.
oracles['send_text'].__defaults__ = (None,)
oracles['read_messages'].__defaults__ = (25, False, None)


@dataclass(frozen=True)
class Session:
    name: str = '测试会话'
    chat_type: object = m.ChatType.PRIVATE


@dataclass(frozen=True)
class Message:
    message_id: object
    direction: object


@dataclass(frozen=True)
class Conversation:
    chat_type: object
    messages: tuple


class Host:
    """Test-only driver dependencies. Not a recovered production driver."""
    def __init__(self, result, *, unknown=False, missing=False, error=None, capability_failure=False,
                 mapped_type=m.ChatType.PRIVATE, mapper_error=False):
        self.calls=[]
        self._session_index={'i': {} if missing else {'s': Session(chat_type=m.ChatType.UNKNOWN if unknown else m.ChatType.PRIVATE)}}
        self._verified_incoming_messages={('i','s'):{'incoming'}}
        self._confirmed_group_session_ids=set()
        self.lock=asyncio.Lock()
        self.capability_failure=capability_failure
        async def call(action, arguments, timeout_seconds):
            self.calls.append((action,arguments,timeout_seconds))
            if error: raise error()
            return result
        self._helper=types.SimpleNamespace(call=call)
        def conversation(raw, **kwargs):
            if mapper_error: raise m.MacOSHelperPayloadError('bad payload')
            return Conversation(mapped_type, (Message('incoming',m.MessageDirection.INCOMING),
                Message('outgoing',m.MessageDirection.OUTGOING), Message('',m.MessageDirection.INCOMING)))
        self._mapper=types.SimpleNamespace(conversation=conversation)
    def _write_capability_failure(self,name):
        if self.capability_failure:
            return m.OperationResult.failed(ErrorCode.CAPABILITY_UNAVAILABLE,'disabled')
    def _require_capability(self,name):
        if self.capability_failure: raise AutomationError(ErrorCode.CAPABILITY_UNAVAILABLE,'disabled')
    def _attached_instance(self,instance):
        if instance!='i': raise AutomationError(ErrorCode.INSTANCE_NOT_FOUND,'missing instance')
        return types.SimpleNamespace(nickname='测试账号',account_id='account')
    def _operation_lock(self,instance): return self.lock
    def _instance_arguments(self,instance): return {'instanceId':instance}


class DifferentialMessages(unittest.IsolatedAsyncioTestCase):
    async def compare_case(self, name, result, args, host_args=None):
        outcomes=[]
        for fn in [oracles[name],getattr(m.MacOSAxMessageMethods,name)]:
            host=Host(result,**(host_args or {}))
            value=await capture(fn(host,*args))
            outcomes.append((value,host.calls,host._session_index,
                             host._verified_incoming_messages,host._confirmed_group_session_ids))
        self.assertEqual(*outcomes)

    async def test_send_matrix(self):
        good={'sessionId':'s','sessionName':'测试会话','chatType':'private',
              'verified':True,'attemptCount':1,'returnPressCount':1,'messageId':'sent'}
        cases=[({},('i','s','你好'),{}),({'receipt':good},('i',' s ',' 你好 ',' incoming '),{})]
        for key,value in [('sessionId','other'),('sessionName','other'),('chatType','group'),
                          ('verified',False),('verified',1),('attemptCount',2),('returnPressCount',0)]:
            cases.append(({'receipt':dict(good,**{key:value})},('i','s','你好'),{}))
        for content in ['', ' ',None,'x'*512,'x'*513]:
            cases.append(({'receipt':good},('i','s',content),{}))
        for quote in ['',3,'unknown','incoming']:
            cases.append(({'receipt':good},('i','s','你好',quote),{}))
        for host in [{'unknown':True},{'missing':True},{'capability_failure':True},
                     {'error':lambda: m.MacOSHelperCallError(ErrorCode.OPERATION_TIMEOUT,'IPC_TIMEOUT','timeout')}]:
            cases.append(({'receipt':good},('i','s','你好'),host))
        cases.extend([({'receipt':good},('other','s','你好'),{}),({'receipt':good},('i',None,'你好'),{})])
        for n,(result,args,host) in enumerate(cases):
            with self.subTest(case=n): await self.compare_case('send_text',result,args,host)

    async def test_read_matrix(self):
        good={'sessionId':'s','sessionName':'测试会话','expectedAnchorMatched':True}
        cases=[({},('i','s'),{}),({'conversation':good},('i',' s ',25,True,'anchor'),{})]
        for key,value in [('sessionId','other'),('sessionName','other'),('expectedAnchorMatched',False)]:
            cases.append(({'conversation':dict(good,**{key:value})},('i','s',25,False,'anchor'),{}))
        for limit in [0,1,25,26,True,'25']:
            cases.append(({'conversation':good},('i','s',limit),{}))
        for parse in [0,True,False]:
            cases.append(({'conversation':good},('i','s',25,parse),{}))
        for anchor in ['',1,'x'*513]:
            cases.append(({'conversation':good},('i','s',25,False,anchor),{}))
        for host in [{'missing':True},{'capability_failure':True},{'mapper_error':True},
                     {'mapped_type':m.ChatType.UNKNOWN},{'mapped_type':m.ChatType.GROUP},
                     {'unknown':True,'mapped_type':m.ChatType.GROUP}]:
            cases.append(({'conversation':good},('i','s'),host))
        cases.extend([({'conversation':good},('other','s'),{}),({'conversation':good},('i',None),{})])
        for n,(result,args,host) in enumerate(cases):
            with self.subTest(case=n): await self.compare_case('read_messages',result,args,host)

    def test_operation_result_against_original(self):
        import WeRobotCore.domain.errors as errors
        original=original_module('oracle_operation','WeRobotCore/domain/models/operation.marshal',{'errors':errors})
        for name,args,kwargs in [('succeeded',(),{}),('succeeded',('done',True,{'x':1}),{}),
                                  ('failed',(ErrorCode.OPERATION_FAILED,'error'),{}),
                                  ('failed',(ErrorCode.OK,'error'),{}),
                                  ('failed',(ErrorCode.RATE_LIMITED,'wait'),{'retryable':True})]:
            outcomes=[]
            for cls in [original.OperationResult,m.OperationResult]:
                try: outcomes.append(asdict(getattr(cls,name)(*args,**kwargs)))
                except Exception as e: outcomes.append((type(e).__name__,str(e)))
            self.assertEqual(*outcomes)
