# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: voice_settings_store.marshal (Python 3.9)

'''
voice_settings.json 的读写封装：把加密/脱敏/默认值合并集中在一处，
避免在 API 层和 service 层各写一遍。

落盘格式：sensitive fields（access_token / api_key）以 dpapi:v1: 前缀的密文存储；
不敏感字段（app_id / endpoint / resource_id_*）明文存储便于排查。

对外提供：
- load_voice_settings_decrypted():  解密后的完整配置，供 voice_service 使用
- load_voice_settings_masked():      脱敏后的视图，供 GET /api/voice/config
- save_voice_settings(incoming):     合并保存，自动加密敏感字段
- update_compliance_agreed(version): 记录用户同意合规协议的时间与版本
'''
from __future__ import annotations
import copy
import time
from typing import Any, Dict
from utils.config_manager import ConfigManager
from utils.dpapi_crypto import decrypt, encrypt, mask, is_encrypted
CONFIG_KEY = 'voice_settings'
COMPLIANCE_VERSION = 'v1.0'
DEFAULT_SETTINGS: 'Dict[str, Any]' = {
    'provider': 'doubao',
    'doubao': {
        'app_id': '',
        'access_token': '',
        'api_key': '',
        'access_key_id': '',
        'secret_access_key': '',
        'open_api_region': 'cn-north-1',
        'open_api_endpoint': 'https://open.volcengineapi.com',
        'resource_id_clone': 'seed-icl-2.0',
        'resource_id_tts': 'seed-tts-2.0',
        'endpoint': 'https://openspeech.bytedance.com' },
    'auto_reply_speed': 1,
    'tts_max_chars': 120,
    'compliance_agreed_at': None,
    'compliance_agreed_version': None }
_SENSITIVE_FIELDS_BY_PROVIDER = {
    'doubao': ('access_token', 'api_key', 'secret_access_key') }

def _merge_defaults(stored = None):
    '''把存储的部分配置叠到默认值上，避免缺字段导致 KeyError。'''
    merged = copy.deepcopy(DEFAULT_SETTINGS)
    if not isinstance(stored, dict):
        return merged
# WARNING: Decompyle incomplete


def _load_raw():
    cfg_mgr = ConfigManager()
    if not cfg_mgr.load_config(CONFIG_KEY):
        pass
    raw = { }
    return _merge_defaults(raw)


def load_voice_settings_decrypted():
    '''解密后的完整配置。**仅给后端 service 内部用，绝不返回前端。**'''
    s = _load_raw()
    if not s.get('provider'):
        pass
    provider = ''.lower()
    sensitive = _SENSITIVE_FIELDS_BY_PROVIDER.get(provider, ())
    if provider in s and isinstance(s[provider], dict):
        for f in sensitive:
            s[provider][f] = decrypt(s[provider].get(f))
    return s


def load_voice_settings_masked():
    '''供 GET /api/voice/config 使用。敏感字段返回脱敏视图 + has_value 布尔。'''
    s = _load_raw()
    if not s.get('provider'):
        pass
    provider = ''.lower()
    sensitive = _SENSITIVE_FIELDS_BY_PROVIDER.get(provider, ())
    if provider in s and isinstance(s[provider], dict):
        for f in sensitive:
            raw_val = s[provider].get(f)
            s[provider][f] = ''
            s[provider][f'''{f}_masked'''] = mask(raw_val) if raw_val else ''
            s[provider][f'''{f}_has_value'''] = bool(raw_val)
    s['compliance_current_version'] = COMPLIANCE_VERSION
    return s


def save_voice_settings(incoming = None):
    '''
    把前端传入的配置合并存储。约定：
    - 敏感字段值为空字符串时表示"用户未修改，保留原值"（前端永远拿到空）
    - 敏感字段值非空时，加密后落盘
    - 非敏感字段直接覆盖
    '''
    if not isinstance(incoming, dict):
        raise ValueError('voice_settings 必须是对象')
    current_raw = _load_raw()
    merged = copy.deepcopy(current_raw)
    if not incoming.get('provider') and merged.get('provider'):
        pass
    new_provider = 'doubao'.lower()
    merged['provider'] = new_provider
# WARNING: Decompyle incomplete


def update_compliance_agreed():
    '''记录用户同意当前版本合规协议。'''
    s = _load_raw()
    s['compliance_agreed_at'] = int(time.time())
    s['compliance_agreed_version'] = COMPLIANCE_VERSION
    cfg_mgr = ConfigManager()
    cfg_mgr.save_config(CONFIG_KEY, s)
    return s

