# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: runtime_lease.marshal (Python 3.9)

'''Explicit HTTP adapter for the Agent Session v2 runtime-lease contract.'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
import functools
import math
import time
from typing import Any, Callable, Mapping, Protocol, runtime_checkable
from urllib.parse import urlsplit, urlunsplit
from uuid import UUID
from WeRobotCore.application.control_runtime_lease import ControlRuntimeLease, ControlRuntimeLeaseVerification
_REQUEST_TIMEOUT_SECONDS = 5
_TERMINAL_CODES = frozenset({
    'AGENT_SESSION_INVALID',
    'RPA_LEASE_REQUIRED',
    'SEAT_NOT_FOUND',
    'AGENT_SESSION_UPGRADE_REQUIRED',
    'AGENT_SESSION_REPLACED',
    'SEAT_EXPIRED',
    'ERROR_BIND_LIMIT_EXCEEDED',
    'ERROR_NO_AVAILABLE_SEATS'})
_RETRYABLE_CODES = frozenset({
    'INTERNAL_ERROR',
    'RPA_LEASE_SERVICE_UNAVAILABLE',
    'AGENT_SESSION_SERVICE_UNAVAILABLE'})

def _nonempty_text(name = None, value = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(name))
    return value.strip()


def _normalized_api_base(value = None):
    candidate = _nonempty_text('api_base', value).rstrip('/')
    parsed = urlsplit(candidate)
    if parsed.scheme not in ('http', 'https') and parsed.netloc and parsed.username is not None and parsed.password is not None and parsed.query or parsed.fragment:
        raise ValueError('api_base must be an HTTP(S) origin or path')
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip('/'), '', ''))


def _canonical_uuid4(name = None, value = None):
    text = _nonempty_text(name, value)
# WARNING: Decompyle incomplete


def _parse_timestamp(value = None):
    if not isinstance(value, str) or value:
        raise ValueError('runtime lease expires_at must be an ISO timestamp')
# WARNING: Decompyle incomplete


def _server_error_code(payload = None):
    value = payload.get('error_code')
    if isinstance(value, str):
        return value

YokoRuntimeLeaseResponse = dataclass(True, **('frozen',))(<NODE:12>)
YokoRuntimeLeaseTransport = runtime_checkable(<NODE:12>)

class RequestsYokoRuntimeLeaseTransport:
    '''Lazy requests transport for acquire and heartbeat on one endpoint.'''
    
    def _acquire_or_renew_sync(*, api_base, token, machine_code, runtime_id, channel_id, timeout_seconds):
        import requests
        response = requests.post(api_base + '/v1/rpa/auth/verify', {
            'machine_code': machine_code,
            'runtime_id': runtime_id }, {
            'Authorization': 'Bearer {}'.format(token),
            'X-Channel-ID': channel_id }, timeout_seconds, **('json', 'headers', 'timeout'))
    # WARNING: Decompyle incomplete

    _acquire_or_renew_sync = None(_acquire_or_renew_sync)
    
    async def acquire_or_renew(self = None, *, api_base, token, machine_code, runtime_id, channel_id, timeout_seconds):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, functools.partial(self._acquire_or_renew_sync, api_base, token, machine_code, runtime_id, channel_id, timeout_seconds, **('api_base', 'token', 'machine_code', 'runtime_id', 'channel_id', 'timeout_seconds')))
        return <NODE:28>

    
    def _release_sync(*, api_base, token, runtime_id, lease_id, channel_id, timeout_seconds):
        import requests
        response = requests.post(api_base + '/v1/rpa/runtime/release', {
            'runtime_id': runtime_id,
            'lease_id': lease_id }, {
            'Authorization': 'Bearer {}'.format(token),
            'X-Channel-ID': channel_id }, timeout_seconds, **('json', 'headers', 'timeout'))
    # WARNING: Decompyle incomplete

    _release_sync = None(_release_sync)
    
    async def release(self = None, *, api_base, token, runtime_id, lease_id, channel_id, timeout_seconds):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, functools.partial(self._release_sync, api_base, token, runtime_id, lease_id, channel_id, timeout_seconds, **('api_base', 'token', 'runtime_id', 'lease_id', 'channel_id', 'timeout_seconds')))
        return <NODE:28>


ExplicitYokoRuntimeLeaseClient = dataclass(<NODE:12>)
__all__ = [
    'ExplicitYokoRuntimeLeaseClient',
    'RequestsYokoRuntimeLeaseTransport',
    'YokoRuntimeLeaseResponse',
    'YokoRuntimeLeaseTransport']
