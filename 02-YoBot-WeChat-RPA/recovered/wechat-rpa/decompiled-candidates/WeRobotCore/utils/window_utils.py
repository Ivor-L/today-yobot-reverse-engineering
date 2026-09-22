# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: window_utils.marshal (Python 3.9)

import ctypes
import time
from ctypes import windll
SPI_SETFOREGROUNDLOCKTIMEOUT = 8193
SPIF_SENDWININICHANGE = 2
SPIF_UPDATEINIFILE = 1
SW_RESTORE = 9
SW_SHOW = 5
ALT_KEY = 18
KEYEVENTF_KEYUP = 2

def try_bring_wechat_window_to_front():
    import platform
    if platform.system() != 'Windows':
        return False
    user32 = windll.user32
    VK_CONTROL = 17
    VK_MENU = 18
    VK_W = 87
# WARNING: Decompyle incomplete


def force_focus_window(hwnd):
    '''
    强制将窗口置顶，绕过 Windows 的焦点窃取保护。
    
    优化策略：
    1. Fast Path: 首先尝试直接调用标准 API。如果当前进程有 UI 或在前台，这通常会立即成功且效率最高。
    2. Heavy Path: 如果 Fast Path 失败（通常发生在后台无 UI 模式），则启用复杂的“组合拳”（AttachThreadInput + SPI + Alt键模拟）来绕过限制。
    
    Args:
        hwnd: 目标窗口句柄 (int)
        
    Returns:
        bool: 是否成功置顶
    '''
    if not hwnd:
        return False
    user32 = None.user32
    kernel32 = windll.kernel32
    if not user32.IsWindow(hwnd):
        return False
    if None.GetForegroundWindow() == hwnd:
        return True
    if not None.IsWindowVisible(hwnd):
        try_bring_wechat_window_to_front()
        time.sleep(0.5)
    if not user32.IsIconic(hwnd) or user32.IsWindowVisible(hwnd):
        if user32.IsIconic(hwnd):
            user32.ShowWindow(hwnd, SW_RESTORE)
        else:
            user32.ShowWindow(hwnd, SW_SHOW)
# WARNING: Decompyle incomplete

