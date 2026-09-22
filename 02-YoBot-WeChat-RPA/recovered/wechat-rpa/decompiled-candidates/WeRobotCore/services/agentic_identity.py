# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: agentic_identity.marshal (Python 3.9)

"""Agentic-only message identities. Never replace RPA's UIA id or fingerprint.

UIA ids identify controls, not durable messages. Fingerprints include a sliding
window. Reconcile ordered observations and persist separate occurrence UUIDs.
Only confirmed sequence overlap is reused; no global content/fingerprint dedup.
"""
from __future__ import annotations
import hashlib
import json
import sqlite3
import uuid
from pathlib import Path

def _digest(value):
    return hashlib.sha256(json.dumps(value, False, True, (',', ':'), **('ensure_ascii', 'sort_keys', 'separators')).encode('utf-8')).hexdigest()


def fallback_identity(message):
    '''Compatibility for callers without a snapshot; never trust a UIA id alone.'''
    if message.get('agentic_id'):
        return message['agentic_id']
    return None + _digest(_observation(message))


def batch_identity(messages):
    ids = (lambda .0: [ fallback_identity(message) for message in .0 ])(messages)
    if len(ids) == 1:
        return ids[0]
    return None + _digest(ids)


def _observation(message):
    if not message.get('sender'):
        pass
    sender = ''
    if isinstance(sender, dict):
        sender = sender.get('name', '')
    if not message.get('content'):
        pass
    if not message.get('timestamp') and message.get('time'):
        pass
    if not message.get('id'):
        pass
    if not message.get('fingerprint'):
        pass
    return {
        'sender': sender,
        'self': bool(message.get('isSelf')),
        'content': str(''),
        'time': None,
        'runtime': str(''),
        'fingerprint': str('') }


def _same(left, right):
    if not None((lambda .0 = None: for key in .0:
left[key] == right[key])(('sender', 'self', 'content'))) and not left['time'] and not right['time']:
        pass
    return left['time'] == right['time']


def _evidence(left, right):
    return None((lambda .0 = None: for key in .0:
if bool(left[key]):
passleft[key] == right[key])(('runtime', 'fingerprint', 'time')))


def _same_single_observation(left, right):
    if left['fingerprint'] and right['fingerprint']:
        if left['fingerprint'] == right['fingerprint']:
            pass
        return left['runtime'] == right['runtime']
    if left['runtime'] and left['runtime'] == right['runtime'] and left['time']:
        pass
    return None(left['time'] == right['time'])


class AgenticIdentityStore:
    
    def __init__(self, db_path = (None,)):
        if db_path is None:
            DataManager = DataManager
            import WeRobotCore.utils.data_manager
            db_path = Path(DataManager.get_data_dir_str()) / 'agentic_identity_v2.sqlite3'
        self.db_path = Path(db_path)

    
    def prepare(self, account_id, session_id, snapshot, triggers):
        '''Return copies of history/triggers; original dictionaries stay untouched.

        The transaction covers read/reconcile/write, including concurrent tasks or
        worker restart. A corrupt/unwritable ledger fails before invoking an agent.
        '''
        if not snapshot:
            pass
        current = (lambda .0: [ dict(message) for message in .0 ])(triggers)
        trigger_indices = [
            None] * len(triggers)
        used = set()
        for trigger_index in range(len(triggers) - 1, -1, -1):
            trigger = triggers[trigger_index]
            index = None((lambda .0 = None: 