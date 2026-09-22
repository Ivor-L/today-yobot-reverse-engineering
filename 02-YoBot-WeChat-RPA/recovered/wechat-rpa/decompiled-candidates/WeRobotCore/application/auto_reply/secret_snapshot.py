# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: secret_snapshot.marshal (Python 3.9)

'''Process-scoped secret preloading for synchronous AutoReply configuration.

The platform ``SecretStore`` is asynchronous while the mature configuration
policy resolves Agent credentials synchronously.  A signed product entry must
therefore read the finite, configuration-declared key set before publishing
the runtime and pass only this in-memory resolver downstream.  Authenticated
configuration writes may atomically replace the resolver contents after the
new document and its Keychain entries have both been verified; ordinary
AutoReply requests never access Keychain.
'''
from __future__ import annotations
from types import MappingProxyType
from threading import RLock
from typing import Dict, Iterable, Mapping, Optional, Tuple
from WeRobotCore.domain import AutomationError, ErrorCode
from WeRobotCore.ports import SecretStore

class PreloadedAutoReplySecretSnapshot:
    '''Atomic in-memory resolver whose representation never contains secrets.'''
    
    def __init__(self = None, values = None):
        self._lock = RLock()
        normalized = self._normalize(values)
        self._values = MappingProxyType(normalized)
        self._keys = tuple(sorted(normalized))

    
    def _normalize(values = None):
        if not isinstance(values, Mapping):
            raise TypeError('values must be a mapping')
        normalized = { }
        for key, value in values.items():
            if not isinstance(key, str) or key.strip():
                raise ValueError('secret keys must be non-empty strings')
            if not isinstance(value, str) or value:
                raise ValueError('preloaded secret values must be non-empty strings')
            normalized[key] = value
        return normalized

    _normalize = None(_normalize)
    
    def keys(self = None):
        with self._lock:
            None(None, None, None)
            return self._keys
            with None:
                if not None:
                    pass

    keys = None(keys)
    
    def resolve(self = None, key = None):
        if not isinstance(key, str) or key.strip():
            raise ValueError('secret key must be a non-empty string')
        with self._lock:
            None(None, None, None)
            return self._values.get(key)
            with None:
                if not None:
                    pass

    
    def replace(self = None, values = None):
        '''Atomically publish one fully verified replacement mapping.'''
        normalized = self._normalize(values)
        replacement = MappingProxyType(normalized)
        keys = tuple(sorted(normalized))
        with self._lock:
            self._values = replacement
            self._keys = keys
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def __repr__(self = None):
        return '{}(keys={!r})'.format(type(self).__name__, self.keys)



def _normalized_keys(keys = None):
    if isinstance(keys, (str, bytes)):
        raise TypeError('keys must be an iterable of strings')
    normalized = set()
    for key in keys:
        if not isinstance(key, str) or key.strip():
            raise ValueError('secret keys must be non-empty strings')
        normalized.add(key.strip())
    return tuple(sorted(normalized))


async def preload_auto_reply_secrets(secret_store = None, keys = None):
    '''Read each required key once and fail before runtime publication.'''
    if not isinstance(secret_store, SecretStore):
        raise TypeError('secret_store must implement SecretStore')
    values = { }
# WARNING: Decompyle incomplete


async def refresh_auto_reply_secrets(snapshot = None, secret_store = None, keys = None):
    '''Load a complete replacement before changing the live resolver.

    A failed Keychain read leaves the previously published mapping untouched.
    '''
    if not isinstance(snapshot, PreloadedAutoReplySecretSnapshot):
        raise TypeError('snapshot must be PreloadedAutoReplySecretSnapshot')
    await preload_auto_reply_secrets(secret_store, keys)
    replacement = <NODE:28>
    values = { }
    for key in replacement.keys:
        value = replacement.resolve(key)
        if value is None:
            raise RuntimeError('preloaded AutoReply secret disappeared')
        values[key] = value
    snapshot.replace(values)

__all__ = [
    'PreloadedAutoReplySecretSnapshot',
    'preload_auto_reply_secrets',
    'refresh_auto_reply_secrets']
