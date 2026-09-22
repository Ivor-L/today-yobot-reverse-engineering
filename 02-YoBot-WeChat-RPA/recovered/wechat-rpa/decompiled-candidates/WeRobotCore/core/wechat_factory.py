# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: wechat_factory.marshal (Python 3.9)

import os
from typing import Optional
from version_detector import detect_version, WeChatVersion

def create_driver(window_handle = None):
    '''
    Create a driver instance based on env override or detected version.

    Returns an instance of a driver exposing `initialize` and `initialize_multi`.
    '''
    LegacyUiaDriver = LegacyUiaDriver
    import drivers.legacy_uia
    PyWeixinDriver = PyWeixinDriver
    import drivers.pyweixin
    version = detect_version(window_handle)
    if version == WeChatVersion.MODERN_4_1:
        return PyWeixinDriver(window_handle, **('window_handle',))
    return None(window_handle, **('window_handle',))

