"""Validate local policy responses with the unmodified RPA 2.0.0 parser."""
import builtins
import importlib
import json
import marshal
from pathlib import Path
import sys
import types

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'restored/python'))
from WeRobotCore.application import control_access

def load(name, relative, dependencies):
    module = types.ModuleType(name)
    sys.modules[name] = module
    allowed = {'__future__', 'asyncio', 'dataclasses', 'datetime', 'math', 'time',
               'typing', 'uuid', 'functools', 'urllib.parse'}
    def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name in dependencies:
            return dependencies[name]
        if level or name not in allowed:
            raise ImportError(name)
        return importlib.import_module(name)
    module.__dict__['__builtins__'] = dict(vars(builtins), __import__=safe_import)
    code = marshal.loads((ROOT/'recovered/wechat-rpa-2.0.0/bytecode'/relative).read_bytes())
    exec(code, module.__dict__)
    return module

lease = load('original_lease', 'WeRobotCore/application/control_runtime_lease.marshal',
             {'WeRobotCore.application.control_access': control_access})
adapter = load('original_lease_adapter', 'WeRobotCore/adapters/control/runtime_lease.marshal',
               {'WeRobotCore.application.control_runtime_lease': lease})
payload = json.load(sys.stdin)
client = object.__new__(adapter.ExplicitYokoRuntimeLeaseClient)
from datetime import datetime, timezone
import time
client.runtime_id = payload['data']['runtime_lease']['runtime_id']
client.wall_clock = lambda: datetime.now(timezone.utc)
client.monotonic_clock = time.monotonic
result = client._parse_active_response(adapter.YokoRuntimeLeaseResponse(200, payload))
assert result.lease is not None, result
assert result.lease.runtime_id == client.runtime_id
print('Original RPA 2.0.0 parser accepted local finite lease')
