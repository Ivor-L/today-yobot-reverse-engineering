# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: WxParam.marshal (Python 3.9)

import ctypes
import logging
from typing import Dict

class WxParam:
    HEIGHT_1080P = {
        'SYS_TEXT_HEIGHT': 33,
        'TIME_TEXT_HEIGHT': 34,
        'RECALL_TEXT_HEIGHT': 45,
        'CHAT_TEXT_HEIGHT': 53,
        'CHAT_IMG_HEIGHT': 195 }
    HEIGHT_2K = {
        'SYS_TEXT_HEIGHT': 50,
        'TIME_TEXT_HEIGHT': 51,
        'RECALL_TEXT_HEIGHT': 64,
        'CHAT_TEXT_HEIGHT': 80,
        'CHAT_IMG_HEIGHT': 168 }
    SYS_TEXT_HEIGHT = HEIGHT_1080P['SYS_TEXT_HEIGHT']
    TIME_TEXT_HEIGHT = HEIGHT_1080P['TIME_TEXT_HEIGHT']
    RECALL_TEXT_HEIGHT = HEIGHT_1080P['RECALL_TEXT_HEIGHT']
    CHAT_TEXT_HEIGHT = HEIGHT_1080P['CHAT_TEXT_HEIGHT']
    CHAT_IMG_HEIGHT = HEIGHT_1080P['CHAT_IMG_HEIGHT']
    SpecialTypes = [
        '[文件]',
        '[图片]',
        '[视频]',
        '[音乐]',
        '[链接]']
    
    def init_resolution(cls):
        '''初始化分辨率相关参数'''
        logger = logging.getLogger(__name__)
    # WARNING: Decompyle incomplete

    init_resolution = classmethod(init_resolution)

