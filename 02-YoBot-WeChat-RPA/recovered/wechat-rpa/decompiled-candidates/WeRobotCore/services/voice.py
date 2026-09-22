# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: voice.marshal (Python 3.9)

'''
语音服务模块：声音复刻 + TTS 合成。

入口：voice_service.get_voice_service() 返回当前配置 provider 的实例。
扩展：新增 provider 实现 VoiceProvider 接口并在 voice_service.PROVIDER_REGISTRY 注册。
'''
from voice_service import get_voice_service, reload_voice_service
from provider_base import VoiceProvider, VoiceInfo, CloneJob, CloneStatus, SynthResult, HealthCheckResult
from  import voice_library, voice_greetings_store, preview_store
__all__ = [
    'get_voice_service',
    'reload_voice_service',
    'VoiceProvider',
    'VoiceInfo',
    'CloneJob',
    'CloneStatus',
    'SynthResult',
    'HealthCheckResult',
    'voice_library',
    'voice_greetings_store',
    'preview_store']
