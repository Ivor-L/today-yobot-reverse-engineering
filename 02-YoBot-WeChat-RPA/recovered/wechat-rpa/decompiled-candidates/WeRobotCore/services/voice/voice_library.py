# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: voice_library.marshal (Python 3.9)

'''
音色库本地存储。

豆包侧不提供"列出我所有 speaker"接口，所以软件端必须自己记账已克隆音色，
包括处于训练中的"半成品"——这样用户重启软件后还能看到进度、补点试听。

存储位置：~/.yokowebot/voice_library.json
全局共享（不绑微信账号；账号选用哪个音色由 voice_assignment.json 决定，Sprint 3）

线程安全：所有读写都包在 _lock 里；并发写场景不多但保守起见加上。
'''
from __future__ import annotations
import json
import os
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional
_FILE = Path.home() / '.yokowebot' / 'voice_library.json'
_lock = threading.Lock()
STATUS_PENDING = 'pending'
STATUS_TRAINING = 'training'
STATUS_ACTIVE = 'active'
STATUS_FAILED = 'failed'
STATUS_REMOTE_DELETED = 'gone'
VALID_STATUSES = {
    STATUS_PENDING,
    STATUS_TRAINING,
    STATUS_ACTIVE,
    STATUS_FAILED,
    STATUS_REMOTE_DELETED}

def _load():
    if not _FILE.exists():
        return {
            'version': 1,
            'voices': [] }
    with open(_FILE, 'r', 'utf-8', **('encoding',)) as f:
        data = json.load(f)
        None(None, None, None)
    with None:
        if not None:
            pass
    if not isinstance(data, dict):
        pass
    return None
    data.setdefault('version', 1)
    data.setdefault('voices', [])
    :
        if not _FILE.exists():
            return {
                'version': 1,
                'voices': [] }
        with open(_FILE, 'r', 'utf-8', **('encoding',)) as f:
            data = json.load(f)
            None(None, None, None)
        with None:
            if not None:
                pass
        if not isinstance(data, dict):
            pass
        return None
        data.setdefault('version', 1)
        data.setdefault('voices', [])
        
        return data
    return data
# WARNING: Decompyle incomplete


def _save(data = None):
    _FILE.parent.mkdir(True, True, **('parents', 'exist_ok'))
    tmp = _FILE.with_suffix('.json.tmp')
    with open(tmp, 'w', 'utf-8', **('encoding',)) as f:
        json.dump(data, f, False, 2, **('ensure_ascii', 'indent'))
        None(None, None, None)
    with None:
        if not None:
            pass
    os.replace(tmp, _FILE)


def list_voices():
    with _lock:
        None(None, None, None)
        return list(_load().get('voices', []))
        with None:
            if not None:
                pass


def get_voice(voice_id = None):
    if not voice_id:
        return None
    with None:
        for v in _load().get('voices', []):
            if v.get('voice_id') == voice_id:
                pass
            None(None, None, None)
            return None
        None(None, None, None)
    with None:
        if not None:
            pass


def add_voice(voice_id = None, name = None, language = None, sample_filename = ('zh', '', STATUS_PENDING), status = {
    'voice_id': 'str',
    'name': 'str',
    'language': 'str',
    'sample_filename': 'str',
    'status': 'str',
    'return': 'Dict' }):
    '''添加一条新音色记录。voice_id 重复时覆盖原有记录。'''
    if not voice_id:
        raise ValueError('voice_id 必填')
    if status not in VALID_STATUSES:
        raise ValueError(f'''非法 status: {status}''')
    now = int(time.time())
    if not name:
        pass
    record = {
        'voice_id': voice_id,
        'name': voice_id,
        'language': language,
        'sample_filename': sample_filename,
        'status': status,
        'created_at': now,
        'last_synced_at': now,
        'demo_audio_url': None,
        'message': '' }
    with _lock:
        data = _load()
        voices = data.get('voices', [])
        voices = (lambda .0 = None: [ v for v in .0 if v.get('voice_id') != voice_id ])(voices)
        voices.append(record)
        data['voices'] = voices
        _save(data)
        None(None, None, None)
    with None:
        if not None:
            pass
    return dict(record)


def update_status(voice_id = None, status = None, demo_audio_url = None, message = (None, None)):
    '''更新指定音色的状态（轮询回填用）；voice_id 不存在返回 None。'''
    if status not in VALID_STATUSES:
        raise ValueError(f'''非法 status: {status}''')
    with _lock:
        data = _load()
        voices = data.get('voices', [])
        for v in voices:
            if v.get('voice_id') == voice_id:
                v['status'] = status
                v['last_synced_at'] = int(time.time())
                if demo_audio_url is not None:
                    v['demo_audio_url'] = demo_audio_url
            if message is not None:
                v['message'] = message
            _save(data)
        else:
            return dict(v)
        dict(v)(None, None, None)
    with None:
        if not None:
            pass


def delete_voice(voice_id = None):
    '''从本地库删除记录（仅删本地账本，不调用豆包接口）。'''
    with _lock:
        data = _load()
        voices = data.get('voices', [])
        new_voices = (lambda .0 = None: [ v for v in .0 if v.get('voice_id') != voice_id ])(voices)
        if len(new_voices) == len(voices):
            pass
        None(None, None, None)
        return False
        data['voices'] = new_voices
        _save(data)
        None(None, None, None)
        return True
        with None:
            if not None:
                pass

