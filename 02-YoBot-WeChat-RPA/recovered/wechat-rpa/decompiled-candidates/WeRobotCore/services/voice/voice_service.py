# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: voice_service.marshal (Python 3.9)

'''
语音服务工厂 + 配置桥接。

外部只调 get_voice_service()；它读 voice_settings.json，按当前 provider
返回对应 Provider 实例（含解密后的凭证）。配置变化后调 reload_voice_service()
让下次获取走最新配置。

配置 schema 见 ConfigManager 默认值；敏感字段（access_token / api_key）落盘前
由 voice_settings_store 模块加密。
'''
from __future__ import annotations
import threading
from typing import Optional
from provider_base import VoiceProvider
from doubao_provider import DoubaoProvider
from voice_settings_store import load_voice_settings_decrypted
PROVIDER_REGISTRY = {
    'doubao': DoubaoProvider }
_lock = threading.Lock()
_cached: 'Optional[VoiceProvider]' = None
_cached_signature: 'Optional[tuple]' = None

def _build(settings = None):
    if not settings.get('provider'):
        pass
    provider_key = 'doubao'.lower()
    cls = PROVIDER_REGISTRY.get(provider_key)
    if not cls:
        return None
    if None == 'doubao':
        if not settings.get('doubao'):
            pass
        cfg = { }
        if not cfg.get('open_api_endpoint'):
            pass
        if not cfg.get('open_api_region'):
            pass
        if not cfg.get('endpoint'):
            pass
        if not cfg.get('resource_id_clone'):
            pass
        if not cfg.get('resource_id_tts'):
            pass
        return DoubaoProvider(cfg.get('app_id', ''), cfg.get('access_token', ''), cfg.get('api_key', ''), cfg.get('access_key_id', ''), cfg.get('secret_access_key', ''), 'https://open.volcengineapi.com', 'cn-north-1', 'https://openspeech.bytedance.com', 'seed-icl-2.0', 'seed-tts-2.0', **('app_id', 'access_token', 'api_key', 'access_key_id', 'secret_access_key', 'open_api_endpoint', 'open_api_region', 'endpoint', 'resource_id_clone', 'resource_id_tts'))


def _signature(settings = None):
    '''识别配置是否变化，决定要不要重建 provider。不包含明文，仅用于比较。'''
    if not settings.get('provider'):
        pass
    provider = ''.lower()
    if not settings.get(provider):
        pass
    cfg = { }
    if not cfg.get('app_id'):
        pass
    if not cfg.get('access_token'):
        pass
    if not cfg.get('api_key'):
        pass
    if not cfg.get('access_key_id'):
        pass
    if not cfg.get('secret_access_key'):
        pass
    if not cfg.get('open_api_endpoint'):
        pass
    if not cfg.get('endpoint'):
        pass
    if not cfg.get('resource_id_clone'):
        pass
    if not cfg.get('resource_id_tts'):
        pass
    return (provider, '', '', '', '', '', '', '', '', '')


def get_voice_service():
    '''
    返回当前配置下的 Provider 实例。配置未填齐或 provider 未知时返回 None。
    '''
    global _cached, _cached_signature
    settings = load_voice_settings_decrypted()
    sig = _signature(settings)
    with _lock:
        if _cached and sig == _cached_signature:
            pass
        None(None, None, None)
        return None
        _cached = _build(settings)
        _cached_signature = sig
        None(None, None, None)
        return _cached
        with None:
            if not None:
                pass


def reload_voice_service():
    '''显式失效缓存并重建。配置保存接口在写盘后调一次。'''
    global _cached, _cached_signature
    with _lock:
        _cached = None
        _cached_signature = None
        None(None, None, None)
    with None:
        if not None:
            pass
    return get_voice_service()

