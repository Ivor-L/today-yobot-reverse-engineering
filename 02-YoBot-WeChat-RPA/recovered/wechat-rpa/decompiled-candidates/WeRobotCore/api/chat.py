# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: chat.marshal (Python 3.9)

from datetime import datetime, timedelta
import os
import asyncio
import json
import hashlib
import random
import time
import threading
import faulthandler
import traceback
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional, Any
import schedule
from WeRobotCore.utils.time_utils import TimeParser
from WeRobotCore.utils.config_manager import ConfigManager
from core.uia_logger import UiaLogger
from core.watchdog_state import get_watchdog_log_dir, record_diagnostic_event, record_uia_event
from WeRobotCore.core.WeChatType import WeChat
from WeRobotCore.core.WxUtils import is_friend_pass_system_text
wx = None
logger = UiaLogger().get_logger()
_uia_executor: Optional[ThreadPoolExecutor] = None
_uia_executor_lock = threading.Lock()
_uia_executor_created_at = 0
_uia_executor_generation = 0
_UIA_TIMEOUT_SESSIONS = float(os.getenv('YOKO_UIA_TIMEOUT_SESSIONS', '8'))
_UIA_TIMEOUT_CHAT_MESSAGES = float(os.getenv('YOKO_UIA_TIMEOUT_CHAT_MESSAGES', '15'))
_UIA_TIMEOUT_SEND_MESSAGE = float(os.getenv('YOKO_UIA_TIMEOUT_SEND_MESSAGE', '10'))
_UIA_TIMEOUT_SEND_FILE = float(os.getenv('YOKO_UIA_TIMEOUT_SEND_FILE', '180'))
_UIA_TIMEOUT_SEND_VOICE = float(os.getenv('YOKO_UIA_TIMEOUT_SEND_VOICE', '90'))
_UIA_SLOW_THRESHOLD = float(os.getenv('YOKO_UIA_SLOW_THRESHOLD', '3'))
_UIA_TIMEOUT_JOIN_GROUP = float(os.getenv('YOKO_UIA_TIMEOUT_JOIN_GROUP', '60'))
_UIA_TIMEOUT_FORWARD_MESSAGE = float(os.getenv('YOKO_UIA_TIMEOUT_FORWARD_MESSAGE', '30'))

def _get_uia_executor():
    global _uia_executor, _uia_executor_created_at, _uia_executor_generation
    with _uia_executor_lock:
        if _uia_executor is None:
            _uia_executor = ThreadPoolExecutor(1, 'uia_worker', **('max_workers', 'thread_name_prefix'))
            _uia_executor_created_at = time.time()
            _uia_executor_generation += 1
        None(None, None, None)
        return _uia_executor
        with None:
            if not None:
                pass


def _dump_hang_snapshot(tag = None):
    pass
# WARNING: Decompyle incomplete


def _get_instance_binding(account_id = None):
    pass
# WARNING: Decompyle incomplete


def _get_active_instance_binding():
    '''Return the authoritative active HWND/account pair from InstanceManagerV2.'''
    pass
# WARNING: Decompyle incomplete


def _is_valid_window_handle(window_handle = None):
    if not window_handle:
        return False
    import win32gui
    :
        if not window_handle:
            return False
        import win32gui
        
        return bool(win32gui.IsWindow(int(window_handle)))
    return bool(win32gui.IsWindow(int(window_handle)))
# WARNING: Decompyle incomplete


def _instance_window_handle(instance):
    if instance is None:
        return None
    if not None(instance, '_bound_window_handle', None):
        pass
    return getattr(instance, 'window_handle', None)


def _initialize_wechat_binding(window_handle, account_info = (None,)):
    """Create/reuse the current thread's WeChat object and initialize its live HWND."""
    if not _is_valid_window_handle(window_handle):
        raise ValueError(f'''invalid WeChat window_handle={window_handle}''')
    wx_local = WeChat(window_handle, **('window_handle',))
    initialized = bool(getattr(wx_local, '_initialized', False))
# WARNING: Decompyle incomplete


def refresh_global_wechat_instance(window_handle, account_info = (None, None)):
    '''Refresh ``chat.wx`` when WeChat restarted and its HWND changed.

    ``chat.wx`` is a compatibility cache.  The authoritative binding lives in
    ``InstanceManagerV2``; keeping the old object after WeChat restarts leaves
    its Qt/UIA provider attached to a dead HWND.  Resolve the current binding,
    create the thread-scoped WeChat object, and atomically replace the cache.
    '''
    global wx
    if not window_handle:
        (window_handle, active_account) = _get_active_instance_binding()
        if account_info is None:
            account_info = active_account
    if not _is_valid_window_handle(window_handle):
        old_handle = _instance_window_handle(wx)
        wx = None
        if old_handle:
            logger.warning(f'''全局微信实例句柄已失效并清空: old_hwnd={old_handle}, requested_hwnd={window_handle}''')
        return None
    old_handle = None(wx)
    owner_thread = getattr(wx, '_owner_thread_id', None) if wx is not None else None
    current_thread = threading.get_ident()
# WARNING: Decompyle incomplete


def _ensure_thread_wechat(account_id = None):
    if not account_id:
        raise ValueError('account_id is required')
    (window_handle, account_info) = _get_instance_binding(account_id)
    if not window_handle:
        raise ValueError(f'''no window_handle for account_id={account_id}''')
    return _initialize_wechat_binding(window_handle, account_info)


def ensure_thread_wechat(account_id = None):
    '''Public wrapper for creating an initialized WeChat instance in a UIA thread.'''
    return _ensure_thread_wechat(account_id)


async def wait_for_uia_idle():
    '''Wait until UIA work submitted before this call has left the executor.'''
    await submit_uia_work((lambda : pass))


def submit_uia_work(fn):
    '''Submit UI Automation work to the process-wide single worker.

    Native UIA calls cannot be cancelled safely.  In particular, a timed-out
    call must keep owning this worker until it really returns; replacing the
    executor would let two threads manipulate the same WeChat window.
    '''
    loop = asyncio.get_running_loop()
    return loop.run_in_executor(_get_uia_executor(), fn)


async def _run_uia(op = None, fn = None, timeout = None, account_id = (None,)):
    ContactSyncBusyError = ContactSyncBusyError
    is_contact_sync_active = is_contact_sync_active
    import WeRobotCore.api.contact_sync_runner
    if is_contact_sync_active():
        raise ContactSyncBusyError('通讯录同步期间暂不可执行其他微信操作')
    start = time.time()
# WARNING: Decompyle incomplete


def get_wechat_instance(account_id = None):
    '''获取已绑定到当前有效 HWND、当前线程的 WeChat 实例。'''
    pass
# WARNING: Decompyle incomplete


async def async_get_latest_sessions(limit = None, start_time = None, account_id = None):
    pass
# WARNING: Decompyle incomplete


def _normalize_anchor_text(text, is_group = (False,)):
    '''标准化锚点/消息文本用于匹配：群消息去掉"发送者："前缀，去零宽字符与全部空白
    （会话列表预览与气泡文本常存在空格差异），兼容 4.1.x 会话列表预览的"…"截断。'''
    if not text:
        return ''
    import re as _re
    t = str(text)
    if is_group:
        t = _re.sub('^[^:：]*[:：]', '', t)
    t = t.replace('﻿', '')
    t = _re.sub('\\s+', '', t)
    if len(t) > 45 and t.endswith('…'):
        t = t[:-3]
    return t

_ANCHOR_SKIP_SENDERS = {
    'JOIN_GROUP',
    'SYS',
    'Recall',
    'GREET',
    'Time'}

def _raw_messages_contain_anchor(messages, anchor, is_group = (False,)):
    '''判断原始读取到的消息列表里是否包含锚点（触发本次任务的那条消息）。

    锚点来自会话列表预览，可能被截断，故采用双向前缀匹配容忍。返回 True 表示已读到，
    无需补读；anchor 为空时返回 True（无从校验，不触发补读）。
    '''
    a = _normalize_anchor_text(anchor, is_group, **('is_group',))
    if not a:
        return True
    if not None:
        pass
# WARNING: Decompyle incomplete


async def async_get_chat_messages(session_name, parse_file, context_count, save_msg, account_id, expected_anchor = (False, 15, False, None, None)):
    pass
# WARNING: Decompyle incomplete


async def async_send_message(user = None, message = None, account_id = None, quote_msg_id = (None, None)):
    pass
# WARNING: Decompyle incomplete


async def async_send_file(user = None, file_path = None, account_id = None):
    '''通过统一 UIA 执行器发送本地文件或可访问的 HTTP(S) 文件 URL。'''
    if not account_id:
        return {
            'success': False,
            'message': 'account_id 必填' }
    
    def _uia_work():
        wx_local = _ensure_thread_wechat(account_id)
        ok = wx_local.SendFiles(user, file_path)
        if not ok:
            return {
                'success': False,
                'message': '文件发送失败' }
        return {
            'success': None,
            'message': '文件发送成功' }

# WARNING: Decompyle incomplete


async def async_send_voice(user = None, mp3_path = None, account_id = None):
    '''
    通过驱动 send_voice 把 mp3 作为语音消息发送给 user。

    Phase A：驱动侧 stub 总返回 False；调用方应在 success=False 时静默回退到
    async_send_message 走文本路径。
    '''
    if not account_id:
        return {
            'success': False,
            'message': 'account_id 必填' }
    
    def _uia_work():
        wx_local = _ensure_thread_wechat(account_id)
        if not wx_local.ChatWith(user):
            return {
                'success': False,
                'message': f'''无法找到用户 {user}''' }
        ok = None.SendVoice(mp3_path, user)
        if not ok:
            return {
                'success': False,
                'message': '语音发送失败（驱动返回 False，可能是版本不支持或 RPA 未实现）' }
        return {
            'success': None,
            'message': '语音发送成功' }

# WARNING: Decompyle incomplete


async def async_join_group_by_invite(user = None, msg_id = None, account_id = None):
    '''点击 user 会话中指定的"邀请你加入群聊"卡片并自动加入。

    必须走 UIA 执行器：加群要滚动消息列表、点击卡片、操作弹窗，与读消息/发消息共用
    同一个 RPA 线程与微信窗口，直接在事件循环线程里点会与它们抢窗口。
    '''
    if not account_id:
        return {
            'success': False,
            'message': 'account_id 必填',
            'already_joined': False }
    
    def _uia_work():
        wx_local = _ensure_thread_wechat(account_id)
        if not wx_local.ChatWith(user):
            return {
                'success': False,
                'message': f'''无法找到会话 {user}''',
                'already_joined': False }
        return None.join_group_by_invite(msg_id)

# WARNING: Decompyle incomplete


async def async_forward_message(user = None, msg_id = None, target = None, account_id = {
    'user': str,
    'msg_id': str,
    'target': str,
    'account_id': str,
    'return': dict }):
    '''将 ``user`` 会话中的指定文本消息转发给 ``target`` 好友或群聊。'''
    if not account_id:
        return {
            'success': False,
            'status': 'invalid_account_id',
            'message': 'account_id 必填',
            'msg_id': msg_id,
            'target': target }
    
    def _uia_work():
        wx_local = _ensure_thread_wechat(account_id)
        if not wx_local.ChatWith(user):
            return {
                'success': False,
                'status': 'source_session_not_found',
                'message': f'''无法找到源会话 {user}''',
                'msg_id': msg_id,
                'target': target }
        return None.forward_message(msg_id, target)

# WARNING: Decompyle incomplete


def get_latest_sessions(limit = None, start_time = None, account_id = None):
    '''
    获取最新的会话列表，不需要滚动，只获取可见区域的会话
    
    Args:
        limit (int): 限制返回的会话数量，默认20条
        start_time (float): 开始时间戳
        account_id (str): 账号ID，如果提供则使用账号特定的WeChat实例
        
    Returns:
        list: 会话列表
    '''
    pass
# WARNING: Decompyle incomplete


def get_users_by_tag(tag_id = None):
    '''获取标签下的所有用户'''
    pass
# WARNING: Decompyle incomplete


def get_untagged_users():
    '''获取没有标签的用户列表'''
    pass
# WARNING: Decompyle incomplete


def send_file(user = None, file_path = None):
    '''发送文件消息'''
    pass
# WARNING: Decompyle incomplete


def get_chat_messages(session_name, parse_file, context_count, save_msg, account_id = (False, 15, False, None)):
    pass
# WARNING: Decompyle incomplete


async def get_history_sessions(account_id = None):
    '''
    获取历史会话列表
    
    Args:
        account_id: 账号ID，如果提供则获取指定账号的历史会话
    
    Returns:
        list: 历史会话列表
    '''
    pass
# WARNING: Decompyle incomplete


async def get_history_messages(session_id = None, account_id = None):
    '''
    获取历史会话的消息记录
    
    Args:
        session_id: 会话ID
        account_id: 账号ID，如果提供则获取指定账号的历史消息
        
    Returns:
        dict: 包含消息列表和会话类型的字典
    '''
    pass
# WARNING: Decompyle incomplete


async def delete_history_session(session_id = None, account_id = None):
    '''删除指定账号下某会话的本地历史记录（消息文件 + 索引条目）。

    Args:
        session_id: 会话ID（即会话名）
        account_id: 账号ID
    Returns:
        dict: {"success": bool, "error"?: str}
    '''
    pass
# WARNING: Decompyle incomplete


def get_current_chat_messages(session_name = None, limit = None):
    '''
    获取指定会话的聊天记录
    
    参数:
    - session_name: 会话名称
    - limit: 最大返回消息数量，默认20条
    
    返回:
    - 聊天记录列表
    '''
    pass
# WARNING: Decompyle incomplete


def send_message(user = None, message = None, account_id = None, quote_msg_id = (None, None)):
    '''发送消息并返回结果'''
    pass
# WARNING: Decompyle incomplete


async def start_chat_collection(agent_id = None, max_sessions = None):
    '''开始聊天记录采集'''
    pass
# WARNING: Decompyle incomplete


async def collect_single_session(session_name = None, agent_id = None):
    '''采集单个会话的聊天记录'''
    pass
# WARNING: Decompyle incomplete

