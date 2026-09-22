# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_binding.marshal (Python 3.9)

'''Restart-safe macOS WeChat account bindings.

Only normalized account identity and the opaque native process reference are
persisted.  AX objects, Helper sessions and public compatibility payloads are
intentionally excluded.  Reading or constructing this adapter never launches
the Helper or touches WeChat.
'''
from __future__ import annotations
from dataclasses import dataclass
import json
import os
from pathlib import Path
import stat
import tempfile
import time
from typing import Any, Mapping, Optional
from WeRobotCore.ports import NativeInstanceRef
MACOS_INSTANCE_BINDING_SCHEMA_VERSION = 1
MACOS_INSTANCE_BINDING_FILE_NAME = 'macos_wechat_instance_binding.json'
_MAX_BINDING_BYTES = 16384
_MAX_NATIVE_KEY_LENGTH = 256
_MAX_ACCOUNT_TEXT_LENGTH = 512

def _required_text(value = None, name = None, maximum = None):
    if not isinstance(value, str):
        raise TypeError('{} must be a string'.format(name))
    normalized = value.strip()
    if not normalized:
        raise ValueError('{} must be non-empty'.format(name))
    if len(normalized) > maximum:
        raise ValueError('{} is too long'.format(name))
    return normalized

MacOSPersistedInstanceBinding = dataclass(True, **('frozen',))(<NODE:12>)

class MacOSInstanceBindingStore:
    '''Atomic, exact-path JSON store for one macOS MVP account binding.

    Persistence is an optimization rather than a prerequisite for normal
    initialization.  Invalid, unreadable or unsafe files are therefore
    treated as a cache miss, matching the mature Windows fail-open snapshot
    behavior while keeping native attachment verification fail-closed.
    '''
    
    def __init__(self = None, path = None, *, clock):
        if not isinstance(path, Path):
            raise TypeError('path must be a pathlib.Path')
        if not path.is_absolute():
            raise ValueError('binding path must be absolute')
        if not callable(clock):
            raise TypeError('clock must be callable')
        self._path = path
        self._clock = clock

    
    def path(self = None):
        return self._path

    path = None(path)
    
    def load(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    def save(self = None, binding = None):
        if not isinstance(binding, MacOSPersistedInstanceBinding):
            raise TypeError('binding must be a MacOSPersistedInstanceBinding')
        descriptor = None
        temporary_path = None
    # WARNING: Decompyle incomplete



def create_macos_instance_binding_store(data_root = None):
    '''Create the product store without creating any filesystem objects.'''
    if not isinstance(data_root, Path):
        raise TypeError('data_root must be a pathlib.Path')
    return MacOSInstanceBindingStore(data_root / 'runtime' / MACOS_INSTANCE_BINDING_FILE_NAME)

__all__ = [
    'MACOS_INSTANCE_BINDING_FILE_NAME',
    'MACOS_INSTANCE_BINDING_SCHEMA_VERSION',
    'MacOSInstanceBindingStore',
    'MacOSPersistedInstanceBinding',
    'create_macos_instance_binding_store']
