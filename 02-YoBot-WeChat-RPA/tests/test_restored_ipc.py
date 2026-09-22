"""Differential tests against original bytecode; uses only fake transports.
Run: python3 -m unittest discover -s tests -v (Python 3.9 required).
"""
import asyncio
import builtins
import dataclasses
import importlib
import json
import marshal
from pathlib import Path
import sys
import types
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'restored/python'))
from WeRobotCore.adapters.wechat.macos_ax import ipc as restored
from WeRobotCore.application import control_access as restored_access


def original_module(name, module_path, dependencies=None):
    """Load only audited pure module definitions; restrict their imports."""
    dependencies = dependencies or {}
    module = types.ModuleType(name)
    sys.modules[name] = module  # dataclasses inspects this registry.
    allowed = {'asyncio', 'json', 'uuid', 'typing', 'enum', 'dataclasses'}
    def restricted_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name in dependencies:
            return dependencies[name]
        if level or name not in allowed:
            raise ImportError('Original module import not allowed: ' + name)
        return importlib.import_module(name)
    module.__dict__['__builtins__'] = dict(vars(builtins), __import__=restricted_import)
    code = marshal.loads((ROOT / 'recovered/wechat-rpa/bytecode' / module_path).read_bytes())
    exec(code, module.__dict__)
    return module


if sys.version_info[:2] != (3, 9):
    raise unittest.SkipTest('Original bytecode requires CPython 3.9')
original_errors = original_module('oracle_errors', 'WeRobotCore/domain/errors.marshal')
original_access = original_module('oracle_access', 'WeRobotCore/application/control_access.marshal')
original = original_module('oracle_ipc', 'WeRobotCore/adapters/wechat/macos_ax/ipc.marshal', {
    'WeRobotCore.domain': original_errors,
    'WeRobotCore.application.control_access': original_access,
})


def error_value(e):
    code = getattr(e, 'code', None)
    return {'error': type(e).__name__, 'message': str(e),
            'code': getattr(code, 'value', code), 'helper_code': getattr(e, 'helper_code', None),
            'retryable': getattr(e, 'retryable', None)}


async def capture(awaitable):
    try:
        result = await awaitable
        return dataclasses.asdict(result) if dataclasses.is_dataclass(result) else result
    except BaseException as e:
        return error_value(e)


class FakeTransport:
    def __init__(self, response=None, failure=None):
        self.response = response
        self.failure = failure
        self.requests = []
        self.aborts = 0
    async def exchange(self, request, timeout):
        self.requests.append((request, timeout))
        if self.failure:
            raise self.failure()
        return self.response
    async def abort_active_session(self):
        self.aborts += 1


class DifferentialIPC(unittest.IsolatedAsyncioTestCase):
    async def exercise(self, module, response, *, failure=None, action=' wechat.message.send_text ',
                       arguments=None, timeout=None, request_id='test-request', auth=None):
        transport = FakeTransport(response, failure)
        client = module.MacOSHelperClient(transport, request_id_factory=lambda: request_id)
        if auth:
            access = original_access if module is original else restored_access
            async def authorizer():
                if auth == 'raise':
                    raise RuntimeError('private diagnostic must be sanitized')
                if auth == 'invalid':
                    return True
                return access.ControlAccessDecision.denied(code='DENIED', message='denied', status_code=403)
            client.bind_access_authorizer(authorizer)
        result = await capture(client.call(action, arguments, timeout_seconds=timeout))
        return result, transport.requests, transport.aborts

    async def test_response_and_input_matrix(self):
        good = dict(protocolVersion=1, requestId='test-request', success=True, result={'ok': 1})
        cases = [dict(response=good), dict(response=None), dict(response=[])]
        for patch in [dict(protocolVersion=2), dict(requestId='other'), dict(success=1),
                      dict(success=None), dict(result=[]), dict(result=None),
                      dict(result={'bad': object()}), dict(result={'large': '中' * 23000}),
                      dict(success=False), dict(success=False, error=[]),
                      dict(success=False, error={'code': '', 'message': 'x'}),
                      dict(success=False, error={'code': 'X', 'message': ''}),
                      dict(success=False, error={'code': 'WECHAT_PROCESS_NOT_FOUND', 'message': 'missing'})]:
            cases.append(dict(response=dict(good, **patch)))
        for action in ['', '  ', None, 1]:
            cases.append(dict(response=good, action=action))
        for arguments in [[], 0, {'bad': object()}, {'large': 'x' * 65536}]:
            cases.append(dict(response=good, arguments=arguments))
        for timeout in [0, -1, '2.5']:
            cases.append(dict(response=good, timeout=timeout))
        for request_id in ['', None, 3]:
            cases.append(dict(response=good, request_id=request_id))
        for failure in [asyncio.TimeoutError, lambda: RuntimeError('transport failed'), asyncio.CancelledError]:
            cases.append(dict(response=good, failure=failure))
        for auth in ['deny', 'raise', 'invalid']:
            cases.append(dict(response=good, auth=auth))
        for n, case in enumerate(cases):
            with self.subTest(case=n):
                self.assertEqual(await self.exercise(original, **case), await self.exercise(restored, **case))

    def test_error_mapping(self):
        self.assertEqual({k: v.value for k,v in original._HELPER_ERROR_CODES.items()},
                         {k: v.value for k,v in restored._HELPER_ERROR_CODES.items()})
        for code in [*original._HELPER_ERROR_CODES, '', None, 1, 'unknown',
                     ' new_PERMISSION_REQUIRED ', 'X_CONFIRMATION_REQUIRED', 'X_NOT_FOUND']:
            with self.subTest(code=code):
                self.assertEqual(original.map_helper_error_code(code).value,
                                 restored.map_helper_error_code(code).value)

    def test_frame_boundary(self):
        for value in ['x'*65533, 'x'*65534, '中'*21844, {'nonjson': object()}]:
            def outcome(module):
                try:
                    module.MacOSHelperClient._require_bounded_json(value, 'request')
                except Exception as e:
                    return error_value(e)
            self.assertEqual(outcome(original), outcome(restored))

    async def test_snapshot_session_lifecycle(self):
        async def exercise(module, mismatch=False, missing=False, cancel=False):
            events = []
            responses = [dict(success=True, result={'contactPage': {'complete': False, 'nextCursor': 'c1'}}),
                         dict(success=True, result={'contactPage': {'complete': True}}),
                         dict(success=True, result={'ok': True})]
            class Session:
                async def exchange_frame(self, request, timeout):
                    events.append(('exchange', request, timeout))
                    if cancel:
                        raise asyncio.CancelledError()
                    return responses.pop(0)
                async def close(self):
                    events.append('close')
            class Factory:
                async def open_session(self, timeout):
                    events.append(('open', timeout))
                    return Session()
            transport = module.SessionMacOSHelperTransport(Factory())
            outcomes = []
            args = {'cursor': 'c1'} if missing else {}
            outcomes.append(await capture(transport.exchange({'action': 'wechat.contacts.list', 'arguments': args}, 8)))
            if not missing and not cancel:
                outcomes.append(await capture(transport.exchange({'action': 'wechat.contacts.list',
                    'arguments': {'cursor': 'wrong' if mismatch else 'c1'}}, 8)))
                if not mismatch:
                    outcomes.append(await capture(transport.exchange({'action': 'wechat.message.send_text', 'arguments': {}}, 8)))
            await transport.abort_active_session()
            return outcomes, events, transport._snapshot_action, transport._expected_cursor
        for kwargs in [{}, {'mismatch': True}, {'missing': True}, {'cancel': True}]:
            with self.subTest(kwargs=kwargs):
                self.assertEqual(await exercise(original, **kwargs), await exercise(restored, **kwargs))

    async def test_authorization_fallback_matrix(self):
        async def exercise(module, backend, seat, legacy):
            events = []
            async def s():
                events.append('seat')
                if seat == 'error': raise RuntimeError('error')
                return seat
            async def l():
                events.append('legacy')
                if legacy == 'error': raise RuntimeError('error')
                return legacy
            obj = module.LegacyCompatibleControlAccessAuthorizer(
                backend_mode=backend, seat_verifier=s, legacy_license_verifier=l)
            return await capture(obj()), events
        for backend in [False, True]:
            for seat in [True, False, 'error', None]:
                for legacy in [True, False, 'error', None]:
                    with self.subTest(backend=backend, seat=seat, legacy=legacy):
                        self.assertEqual(await exercise(original_access, backend, seat, legacy),
                                         await exercise(restored_access, backend, seat, legacy))

    def test_decision_validation(self):
        cases = [dict(allowed=True,status_code=200,code='',message='',auth_type='test'),
                 dict(allowed=False,status_code=403,code='NO',message='denied')]
        for field, values in [('allowed',[1,None]), ('status_code',[True,0,600,'200']),
                              ('code',[None,4,'']),('message',[None,4,'']),('auth_type',['',3,'test'])]:
            for value in values:
                cases.append(dict(allowed=False,status_code=403,code='NO',message='denied',**{field:value})
                             if field=='auth_type' else dict(dict(allowed=False,status_code=403,code='NO',message='denied'),**{field:value}))
        for kwargs in cases:
            def outcome(module):
                try: return dataclasses.asdict(module.ControlAccessDecision(**kwargs))
                except Exception as e: return error_value(e)
            with self.subTest(kwargs=kwargs):
                self.assertEqual(outcome(original_access), outcome(restored_access))
