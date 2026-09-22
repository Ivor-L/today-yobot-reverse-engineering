# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: provider_base.marshal (Python 3.9)

'''
语音服务 Provider 抽象层。

约定：每个 provider（豆包 / 未来 YokoAgent 等）实现 VoiceProvider 接口。
上层调用 voice_service 不感知具体 provider，便于切换/扩展。
'''
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional
HealthCheckResult = dataclass(<NODE:12>)
VoiceInfo = dataclass(<NODE:12>)
CloneJob = dataclass(<NODE:12>)
CloneStatus = dataclass(<NODE:12>)
SynthResult = dataclass(<NODE:12>)

class VoiceProvider(ABC):
    '''语音 Provider 抽象基类。'''
    provider_id: str = ''
    
    def health_check(self = None):
        '''检查凭证是否有效。前端"测试连接"按钮调用。'''
        pass

    health_check = None(health_check)
    
    def list_voices(self = None):
        '''枚举可用音色（已克隆 + 平台预置）。'''
        pass

    list_voices = None(list_voices)
    
    def clone_voice(self = None, sample_path = None, voice_id = abstractmethod, language = ('zh', None), text = {
        'sample_path': str,
        'voice_id': str,
        'language': str,
        'text': Optional[str],
        'return': CloneJob }):
        """
        提交复刻样本启动训练。

        sample_path: 本地音频文件路径（wav/mp3/m4a 等，5-15s 最佳）
        voice_id:    控制台预占的 speaker_id（豆包形如 S_xxx）
        language:    'zh' | 'en' | 'ja'
        text:        样本对应的文本，用于 WER 校验（可选）
        """
        pass

    clone_voice = None(clone_voice)
    
    def query_clone_status(self = None, voice_id = None):
        '''查询复刻训练状态。'''
        pass

    query_clone_status = None(query_clone_status)
    
    def synthesize(self = None, text = None, voice_id = abstractmethod, out_path = (1,), speed = {
        'text': str,
        'voice_id': str,
        'out_path': str,
        'speed': float,
        'return': SynthResult }):
        '''文本 → 音频文件，写入 out_path。'''
        pass

    synthesize = None(synthesize)

