# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: file_config_store.marshal (Python 3.9)

'''Atomic explicit-root writer for the macOS AutoReply configuration set.

The mature Windows ``ConfigManager`` owns business matching rules but also
owns Windows-era home-directory, cache and encryption behavior.  The macOS
product therefore reuses its document shapes through this narrow store while
keeping paths explicit and credentials out of JSON.
'''
from __future__ import annotations
import json
import os
from pathlib import Path
import tempfile
from typing import Any, Mapping, Optional
from file_config import MACOS_AUTO_REPLY_ACCOUNT_CONFIGS, MACOS_AUTO_REPLY_GLOBAL_CONFIGS
_MAX_CONFIG_BYTES = 2097152

def _safe_account_id(account_id = None):
    if account_id is None:
        return None
    if not None(account_id, str) or account_id.strip():
        raise ValueError('account_id must be a non-empty string or None')
    normalized = account_id.strip()
    if len(normalized.encode('utf-8')) > 255:
        raise ValueError('account_id exceeds the filesystem segment limit')
    if normalized in ('.', '..') or Path(normalized).name != normalized:
        raise ValueError('account_id must be one safe filesystem segment')
    if '\x00' in normalized:
        raise ValueError('account_id must not contain NUL')
    return normalized


class ExplicitPathAutoReplyConfigurationStore:
    '''Read and atomically replace only documents used by the Mac MVP.'''
    
    def __init__(self = None, config_root = None):
        if not isinstance(config_root, Path):
            raise TypeError('config_root must be a pathlib.Path')
        if not config_root.is_absolute():
            raise ValueError('config_root must be an absolute path')
        self._config_root = config_root

    
    def config_root(self = None):
        return self._config_root

    config_root = None(config_root)
    
    def path_for(self = None, config_type = None, account_id = None):
        if not isinstance(config_type, str) or config_type.strip():
            raise ValueError('config_type must be a non-empty string')
        normalized_type = config_type.strip()
        normalized_account = _safe_account_id(account_id)
        if normalized_type in MACOS_AUTO_REPLY_ACCOUNT_CONFIGS:
            if normalized_account is None:
                raise ValueError('account_id is required for account configuration')
            return self._config_root / normalized_account / (normalized_type + '.json')
        if None in MACOS_AUTO_REPLY_GLOBAL_CONFIGS:
            return self._config_root / (normalized_type + '.json')
        raise None('unsupported AutoReply config type: {}'.format(normalized_type))

    
    def _read_document(path = None):
        pass
    # WARNING: Decompyle incomplete

    _read_document = None(_read_document)
    
    def load_config(self = None, config_type = None, *, account_id):
        return self._read_document(self.path_for(config_type, account_id))

    
    def _prepare_parent(self = None, parent = None):
        self._config_root.mkdir(True, True, 448, **('parents', 'exist_ok', 'mode'))
        if self._config_root.is_symlink():
            raise ValueError('config_root must not be a symbolic link')
        parent.mkdir(True, True, 448, **('parents', 'exist_ok', 'mode'))
        if parent.is_symlink():
            raise ValueError('configuration parent must not be a symbolic link')
    # WARNING: Decompyle incomplete

    
    def save_config(self = None, config_type = None, document = None, *, account_id):
        if not isinstance(document, Mapping):
            raise TypeError('configuration document must be a mapping')
        target = self.path_for(config_type, account_id)
        if target.is_symlink():
            raise ValueError('configuration target must not be a symbolic link')
    # WARNING: Decompyle incomplete


__all__ = [
    'ExplicitPathAutoReplyConfigurationStore']
