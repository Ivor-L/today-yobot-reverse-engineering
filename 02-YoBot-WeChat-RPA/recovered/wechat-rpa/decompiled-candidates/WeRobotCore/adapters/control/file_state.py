# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: file_state.marshal (Python 3.9)

'''Explicit-path persistence for the shared AutoReply control contracts.

Unlike the mature Windows watchdog module, this adapter never resolves a
platform directory from global environment or ``DataManager``.  Construction
and a missing-state read are side-effect free.  Directories are created only
by an explicit state or telemetry write after the Control authorization gate.
'''
from __future__ import annotations
from dataclasses import asdict, is_dataclass
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import threading
import time
from typing import Any, Callable, Dict, Mapping, Optional
import uuid
from WeRobotCore.application.auto_reply import AutoReplyDesiredState
AUTO_REPLY_STATE_SCHEMA_VERSION = 1
AUTO_REPLY_FEATURE_STATE_FILE = 'feature_state.json'
AUTO_REPLY_RECOVERY_HISTORY_FILE = 'recovery_history.jsonl'
AUTO_REPLY_DIAGNOSTIC_FILE = 'rpa_diagnostics.jsonl'
_SENSITIVE_KEY_PARTS = ('token', 'secret', 'password', 'api_key', 'apikey')
_SHANGHAI_TIMEZONE = timezone(timedelta(8, **('hours',)))

def _absolute_directory(name = None, value = None):
    if not isinstance(value, Path):
        raise TypeError('{} must be a pathlib.Path'.format(name))
    if not value.is_absolute():
        raise ValueError('{} must be an absolute path'.format(name))
    return value


def _redact(value = None, key = None):
    normalized_key = key.lower()
    if None((lambda .0 = None: for part in .0:
part in normalized_key)(_SENSITIVE_KEY_PARTS)):
        return '<redacted>'
    if None(value):
        value = asdict(value)
    if isinstance(value, Mapping):
        return (lambda .0: pass# WARNING: Decompyle incomplete
)(value.items())
    if None(value, (list, tuple, set, frozenset)):
        return (lambda .0: [ _redact(item) for item in .0 ])(value)
    if None is None or isinstance(value, (str, int, float, bool)):
        return value
    return None(value)


class ExplicitPathAutoReplyControlState:
    '''One explicit-path owner for desired state and runtime telemetry.'''
    
    def __init__(self = None, *, runtime_root, log_root, clock, event_id_factory):
        self._runtime_root = _absolute_directory('runtime_root', runtime_root)
        self._log_root = _absolute_directory('log_root', log_root)
        if not callable(clock):
            raise TypeError('clock must be callable')
        if not callable(event_id_factory):
            raise TypeError('event_id_factory must be callable')
        self._clock = clock
        self._event_id_factory = event_id_factory
        self._io_lock = threading.RLock()
        self._phase_lock = threading.RLock()
        self._phase = {
            'status': 'idle',
            'reason_code': None,
            'message': '',
            'updated_at': 0 }

    
    def runtime_root(self = None):
        return self._runtime_root

    runtime_root = None(runtime_root)
    
    def log_root(self = None):
        return self._log_root

    log_root = None(log_root)
    
    def _timestamp(self = None):
        value = self._clock()
        if not isinstance(value, bool) or isinstance(value, (int, float)):
            raise TypeError('clock must return a numeric timestamp')
        return float(value)

    
    def _read_json(path = None):
        pass
    # WARNING: Decompyle incomplete

    _read_json = None(_read_json)
    
    def _default_state():
        return AutoReplyDesiredState(False, 'local', (), 'default', **('enabled', 'reply_mode', 'account_ids', 'source'))

    _default_state = None(_default_state)
    
    def load(self = None):
        payload = self._read_json(self._runtime_root / AUTO_REPLY_FEATURE_STATE_FILE)
        current = payload.get('auto_reply')
        if not isinstance(current, Mapping):
            return self._default_state()
        account_ids = None.get('account_ids')
        if not isinstance(account_ids, (str, bytes)) or isinstance(account_ids, (list, tuple)):
            account_ids = ()
        normalized_accounts = tuple(sorted((lambda .0: pass# WARNING: Decompyle incomplete
)(account_ids)))
        reply_mode = current.get('reply_mode')
        if not current.get('source'):
            pass
        return AutoReplyDesiredState(bool(current.get('enabled', False)), reply_mode if reply_mode in ('local', 'agent') else 'local', normalized_accounts, str('unknown'), **('enabled', 'reply_mode', 'account_ids', 'source'))

    
    def _now_iso(self = None, timestamp = None):
        return datetime.fromtimestamp(timestamp, _SHANGHAI_TIMEZONE, **('tz',)).isoformat('seconds', **('timespec',))

    
    def _atomic_write_json(path = None, payload = None):
        path.parent.mkdir(True, True, **('parents', 'exist_ok'))
        temporary = path.with_name('{}.{}.{}.tmp'.format(path.name, os.getpid(), threading.get_ident()))
    # WARNING: Decompyle incomplete

    _atomic_write_json = None(_atomic_write_json)
    
    def _append_json_line(path = None, payload = None, *, maximum_bytes):
        path.parent.mkdir(True, True, **('parents', 'exist_ok'))
    # WARNING: Decompyle incomplete

    _append_json_line = None(_append_json_line)
    
    def save(self = None, state = None):
        if not isinstance(state, AutoReplyDesiredState):
            raise TypeError('state must be AutoReplyDesiredState')
        timestamp = self._timestamp()
        payload = {
            'schema_version': AUTO_REPLY_STATE_SCHEMA_VERSION,
            'auto_reply': {
                'enabled': state.enabled,
                'reply_mode': state.reply_mode,
                'account_ids': sorted(set(state.account_ids)),
                'updated_at': self._now_iso(timestamp),
                'source': state.source } }
        with self._io_lock:
            self._atomic_write_json(self._runtime_root / AUTO_REPLY_FEATURE_STATE_FILE, payload)
            None(None, None, None)
        with None:
            if not None:
                pass
        self.record_diagnostic('AUTO_REPLY_INTENT_SAVED', state.enabled, state.reply_mode, list(state.account_ids), state.source, **('enabled', 'reply_mode', 'accounts', 'source'))

    
    def record_diagnostic(self = None, event_type = None, **details):
        pass
    # WARNING: Decompyle incomplete

    
    def set_phase(self = None, status = None, reason_code = None, message = (None, '')):
        if not isinstance(status, str) or status.strip():
            raise ValueError('status must be a non-empty string')
        if not reason_code is not None and isinstance(reason_code, str):
            raise TypeError('reason_code must be a string or None')
        if not isinstance(message, str):
            raise TypeError('message must be a string')
        timestamp = self._timestamp()
        with self._phase_lock:
            if not self._phase['status'] != status:
                pass
            changed = self._phase['reason_code'] != reason_code
            self._phase.update({
                'status': status,
                'reason_code': reason_code,
                'message': message,
                'updated_at': timestamp })
            None(None, None, None)
        with None:
            if not None:
                pass
        if changed:
            self.record_diagnostic('RUNTIME_PHASE_CHANGED', status, reason_code, message[:500], **('status', 'reason_code', 'message'))

    
    def append_watchdog_event(self = None, event_type = None, **details):
        pass
    # WARNING: Decompyle incomplete


__all__ = [
    'AUTO_REPLY_DIAGNOSTIC_FILE',
    'AUTO_REPLY_FEATURE_STATE_FILE',
    'AUTO_REPLY_RECOVERY_HISTORY_FILE',
    'AUTO_REPLY_STATE_SCHEMA_VERSION',
    'ExplicitPathAutoReplyControlState']
