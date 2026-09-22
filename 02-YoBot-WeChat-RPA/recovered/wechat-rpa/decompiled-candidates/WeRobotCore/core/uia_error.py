# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: uia_error.marshal (Python 3.9)

import win32gui
from typing import Optional, Tuple, Any
from uia_logger import UiaLogger
logger = UiaLogger().get_logger()

class WeChatUIAError(Exception):
    '''微信 UIA 操作异常基类'''
    
    def __init__(self = None, message = None, original_error = None):
        super().__init__(message)
        self.original_error = original_error

    __classcell__ = None


class WeChatUIAConnectionError(WeChatUIAError):
    '''微信 UIA 连接断开异常'''
    
    def __init__(self = None, message = None, original_error = None):
        super().__init__(message, original_error)

    __classcell__ = None


class WeChatWindowError(WeChatUIAError):
    '''微信窗口相关异常'''
    
    def __init__(self = None, message = None, original_error = None):
        super().__init__(message, original_error)

    __classcell__ = None


class WeChatCollectionIncompleteError(Exception):
    '''列表采集未确认完整，禁止把当前结果当作完整快照保存。'''
    
    def __init__(self = None, message = None, collected_count = None):
        super().__init__(message)
        self.collected_count = collected_count

    __classcell__ = None


def check_wechat_disconnected(wechat_instance = None):
    '''
    检查微信是否断开连接
    
    Args:
        wechat_instance: WeChat实例
        
    Returns:
        tuple[bool, str]: (是否断开连接, 断开原因)
    '''
    pass
# WARNING: Decompyle incomplete


def uia_error(e = None):
    '''
    处理UIA异常，识别特定类型的错误并转换为对应的异常类
    
    Args:
        e: 原始异常
        
    Returns:
        Optional[WeChatUIAError]: 如果是已知的UIA异常则返回对应的异常对象，否则返回None
    '''
    pass
# WARNING: Decompyle incomplete

