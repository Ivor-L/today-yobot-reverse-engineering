# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: access.marshal (Python 3.9)

'''Concrete, explicit-input adapters for the shared Control access policy.

The mature authorization order lives in
``LegacyCompatibleControlAccessAuthorizer``.  This module supplies only the
Yoko seat verification I/O boundary and the legacy-compatible machine-code
fact.  Importing or constructing either adapter does not read process
environment, access the network, import ``requests`` or touch a license file.
'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass, field
import functools
import hashlib
import platform
import time
from typing import Any, Callable, Mapping, Optional, Protocol, runtime_checkable
from urllib.parse import urlsplit, urlunsplit
_SUCCESS_CACHE_SECONDS = 900
_FAILURE_CACHE_SECONDS = 60
_REQUEST_TIMEOUT_SECONDS = 5

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

YokoSeatVerificationResponse = dataclass(True, **('frozen',))(<NODE:12>)
YokoSeatVerificationTransport = runtime_checkable(<NODE:12>)

class RequestsYokoSeatVerificationTransport:
    '''Lazy ``requests`` adapter matching the established Yoko endpoint.'''
    
    def _verify_sync(*, api_base, token, machine_code, channel_id, timeout_seconds):
        import requests
        response = requests.post(api_base + '/v1/rpa/auth/verify', {
            'machine_code': machine_code }, {
            'Authorization': 'Bearer {}'.format(token),
            'X-Channel-ID': channel_id }, timeout_seconds, **('json', 'headers', 'timeout'))
    # WARNING: Decompyle incomplete

    _verify_sync = None(_verify_sync)
    
    async def verify(self = None, *, api_base, token, machine_code, channel_id, timeout_seconds):
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, functools.partial(self._verify_sync, api_base, token, machine_code, channel_id, timeout_seconds, **('api_base', 'token', 'machine_code', 'channel_id', 'timeout_seconds')))
        return <NODE:28>



class LegacyCompatibleMachineCodeProvider:
    '''Return the exact machine-code shape used by the mature product.'''
    
    def __init__(self = None, system_info_provider = None):
        if not callable(system_info_provider):
            raise TypeError('system_info_provider must be callable')
        self._system_info_provider = system_info_provider
        self._cached = None

    
    def __call__(self = None):
        if self._cached is not None:
            return self._cached
        info = None._system_info_provider()
    # WARNING: Decompyle incomplete


ExplicitYokoSeatVerifier = dataclass(<NODE:12>)
__all__ = [
    'ExplicitYokoSeatVerifier',
    'LegacyCompatibleMachineCodeProvider',
    'RequestsYokoSeatVerificationTransport',
    'YokoSeatVerificationResponse',
    'YokoSeatVerificationTransport']
