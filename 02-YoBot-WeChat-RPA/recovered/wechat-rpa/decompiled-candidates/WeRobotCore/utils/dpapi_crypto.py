# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: dpapi_crypto.marshal (Python 3.9)

__doc__ = '\n基于 Windows DPAPI 的轻量字符串加解密。\n\n用途：把 voice_settings 等配置里的敏感字段（access_token、api_key）\n在落盘前加密，避免明文存储。同一台机器的同一用户解得开，换机器/换用户解不开。\n\n读到加密失败的字段（升级前的明文 / 损坏密文）时返回原值，\n保证配置不会因为加解密问题完全打不开。\n\n非 Windows 平台或 pywin32/win32crypt 不可用时退化为原文（透明 no-op）。\n'
from typing import Optional
import base64
# WARNING: Decompyle incomplete
