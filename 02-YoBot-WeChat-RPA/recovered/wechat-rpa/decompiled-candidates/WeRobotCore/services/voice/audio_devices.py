# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: audio_devices.marshal (Python 3.9)

'''
Windows 音频端点管理（基于 Windows Core Audio API / pycaw）。

核心能力（服务于 AI 语音回复）：
- 枚举 / 探测 VB-Cable 是否安装
- 找到 CABLE Input 的 sounddevice 索引（用于 sd.play 输出）
- 找到 CABLE Output 的 IMMDevice EndpointID（用于设置默认录音设备）
- 通过 IPolicyConfig 临时切换 / 恢复默认录音设备
- 体检函数 check_environment() 给 /api 与日志使用

注意：所有 COM 调用必须在已 CoInitialize 的线程里跑。我们这边都被
sounddevice / pycaw 隐式初始化了，外面不需要手动初始化。
'''
from __future__ import annotations
import os
import shutil
import subprocess
import threading
import warnings
from contextlib import contextmanager
from typing import Dict, List, Optional, Tuple
import comtypes
from comtypes import CLSCTX_ALL, GUID
from pycaw.api.mmdeviceapi import IMMDeviceEnumerator, PROPERTYKEY
from pycaw.api.policyconfig import IPolicyConfig
from pycaw.constants import CLSID_MMDeviceEnumerator, CLSID_CPolicyConfigClient, DEVICE_STATE, STGM
import sounddevice as sd
CABLE_INPUT_PLAYBACK_PREFIX = 'CABLE Input'
CABLE_OUTPUT_RECORDING_PREFIX = 'CABLE Output'
warnings.filterwarnings('ignore', UserWarning, 'pycaw.utils', **('category', 'module'))
_lock = threading.Lock()

def _get_enumerator():
    '''每次创建新的 IMMDeviceEnumerator。COM 对象不能跨线程共享，
    所以这里不做单例缓存，调用方自己持有。'''
    return comtypes.CoCreateInstance(CLSID_MMDeviceEnumerator, IMMDeviceEnumerator, CLSCTX_ALL)


def _get_policy_config():
    return comtypes.CoCreateInstance(CLSID_CPolicyConfigClient, IPolicyConfig, CLSCTX_ALL)


def _friendly_name(dev = None):
    '''读 IMMDevice 的 FriendlyName 属性。失败返回空串。'''
    pass
# WARNING: Decompyle incomplete


def _list_endpoints(direction = None):
    '''
    direction: 0=eRender (播放) / 1=eCapture (录音)
    返回 [{id, name}]，只包含 ACTIVE 端点。
    '''
    out = []
# WARNING: Decompyle incomplete


def list_playback_endpoints():
    '''所有播放端点（输出方向）'''
    return _list_endpoints(0)


def list_recording_endpoints():
    '''所有录音端点（输入方向）'''
    return _list_endpoints(1)


def find_cable_output_endpoint_id():
    '''录音方向的 CABLE Output 端点 ID（用于 SetDefaultEndpoint）。未找到返回 None。'''
    for ep in list_recording_endpoints():
        if ep['name'].startswith(CABLE_OUTPUT_RECORDING_PREFIX):
            return ep['id']
        return None


def find_cable_input_sd_index():
    """
    sounddevice 输出索引（'CABLE Input' 的播放端）。
    优先选满足以下条件的：
    1) 名称以 'CABLE Input' 开头（不要 'CABLE In 16ch' 这种 16ch 变体，除非别无选择）
    2) max_output_channels >= 2
    """
    pass
# WARNING: Decompyle incomplete


def get_default_recording_endpoint_id(role = None):
    '''
    当前默认录音设备 endpoint ID。role: 0=eConsole, 2=eCommunications。
    未找到返回 None。
    '''
    pass
# WARNING: Decompyle incomplete


def set_default_recording_endpoint(endpoint_id = None, roles = None):
    '''
    通过 IPolicyConfig.SetDefaultEndpoint 切换默认录音设备。
    默认对所有 role（eConsole/eMultimedia/eCommunications）都切，避免微信用了某个特定 role。
    返回是否成功。
    '''
    if not endpoint_id:
        return False
    policy = _get_policy_config()
    for r in roles:
        policy.SetDefaultEndpoint(endpoint_id, r)
    :
        if not endpoint_id:
            return False
        policy = _get_policy_config()
        for r in roles:
            policy.SetDefaultEndpoint(endpoint_id, r)
        
        return True
    return True
# WARNING: Decompyle incomplete


def temporary_default_recording_device(target_endpoint_id = None):
    '''
    上下文管理：进入时切换默认录音设备到 target，退出时恢复原值。

    用法：
        with temporary_default_recording_device(cable_output_id):
            # 这段时间内系统默认录音 = CABLE Output
            ... 触发录音 ...
        # 退出后自动恢复

    target 为空或切换失败时 yield False；调用方可据此 fallback。
    '''
    if not target_endpoint_id:
        yield False
        return None
    original_id = None(0, **('role',))
# WARNING: Decompyle incomplete

temporary_default_recording_device = None(temporary_default_recording_device)

def _hidden_subprocess_kwargs():
    '''Windows 下完全隐藏子进程窗口，避免 ffmpeg 黑窗一闪。'''
    if os.name != 'nt':
        return { }
    startupinfo = None.STARTUPINFO()
    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    startupinfo.wShowWindow = 0
    return {
        'creationflags': 134217728,
        'startupinfo': startupinfo }


def check_ffmpeg():
    """
    探测 ffmpeg 是否可在 PATH 中调用。
    返回：{'installed': bool, 'version': str|None, 'path': str|None}
    """
    path = shutil.which('ffmpeg')
    if not path:
        return {
            'installed': False,
            'version': None,
            'path': None }
# WARNING: Decompyle incomplete


def check_environment():
    """
    诊断报告：给前端展示 + 后端日志参考。
    返回示例：
    {
      'ok': True,
      'vb_cable_installed': True,
      'ffmpeg': {'installed': True, 'version': '6.1.1', 'path': 'C:\\...\\ffmpeg.exe'},
      'cable_output_endpoint_id': '{0.0.1...}',
      'cable_input_sd_index': 6,
      'default_recording_name': 'UGREEN Camera 2K',
      'playback_endpoints': [...],
      'recording_endpoints': [...],
      'reason': None,
    }
    """
    info = {
        'ok': False,
        'vb_cable_installed': False,
        'ffmpeg': {
            'installed': False,
            'version': None,
            'path': None },
        'cable_output_endpoint_id': None,
        'cable_input_sd_index': None,
        'default_recording_id': None,
        'default_recording_name': None,
        'playback_endpoints': [],
        'recording_endpoints': [],
        'reason': None }
# WARNING: Decompyle incomplete

