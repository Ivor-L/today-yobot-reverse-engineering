# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: WxUtils.marshal (Python 3.9)

import os
import time
from datetime import datetime
import re
from ctypes import *
from pathlib import Path
import random
import json
from typing import Optional, Dict, List
import hashlib
import uiautomation as ui_Coder
import win32clipboard as wc
import win32con
import win32gui
import win32api
from WeRobotCore.application.group_invite import extract_group_invite_name, is_group_invite_card_text
from WxParam import WxParam
from uia_logger import UiaLogger
logger = UiaLogger().get_logger()
_SELF_JOIN_GROUP_PATTERNS = [
    re.compile('邀请你.*?加入了群聊'),
    re.compile('你通过.*?加入群聊'),
    re.compile('\\s加入群聊')]

def is_self_join_group_text(text = None):
    '''判断一条系统提示文本是否为【本账号新进群/建群】提示。'''
    if not text:
        pass
    s = ''
    return None((lambda .0 = None: for p in .0:
p.search(s))(_SELF_JOIN_GROUP_PATTERNS))

_FRIEND_PASS_SYSTEM_PATTERN = re.compile('^你已添加了.*现在可以开始聊天了')

def is_friend_pass_system_text(text = None):
    '''判断一条系统提示文本是否为【对方通过我方好友申请】提示。'''
    if not text:
        pass
    s = ''.strip()
    return bool(_FRIEND_PASS_SYSTEM_PATTERN.search(s))


class WxUtils:
    
    def _collapse_exact_repeated_text(text = None):
        '''Collapse an exact ``X + whitespace + X`` UIA text duplication.

        WeChat 4.1.x can briefly expose a duplicated ``ChatTextItemView.Name``
        while its accessibility cache is being refreshed. Only a whitespace
        run exactly at the centre of the value is considered, and both sides
        must be non-empty and exactly equal. This deliberately also turns an
        intentional ``"好 好"`` into ``"好"`` because UIA has no metadata that
        can reliably distinguish it from the cache defect.
        '''
        if not isinstance(text, str):
            return text
        candidate = None.strip()
        if not candidate:
            return text
        value_len = None(candidate)
        for separator in re.finditer('\\s+', candidate):
            if separator.start() != value_len - separator.end():
                continue
            left = candidate[:separator.start()]
            right = candidate[separator.end():]
            if left and left == right:
                return left
            return text

    _collapse_exact_repeated_text = None(_collapse_exact_repeated_text)
    
    def find_controls_by_type(control, control_type, max_depth, current_depth = (10, 0)):
        '''通用的控件遍历方法'''
        if current_depth >= max_depth:
            return []
        controls = None
        
        try:
            for child in control.GetChildren():
                if child.ControlTypeName == control_type:
                    controls.append(child)
                controls.extend(WxUtils.find_controls_by_type(child, control_type, max_depth, current_depth + 1))
        finally:
            pass
        return controls


    
    def is_shift_pressed():
        '''检测是否按下 Shift 键（用于终止任务等场景）。'''
        pass
    # WARNING: Decompyle incomplete

    
    def parse_publish_time_41x(time_str = None):
        '''解析 4.1.x 版本朋友圈时间字符串，返回时间戳。

        支持：
        - 刚刚 / X分钟前 / X小时前 / X天前
        - 昨天 HH:MM / 前天 HH:MM
        - M月D日 HH:MM / YYYY年M月D日 HH:MM
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def parse_moment_item_41x(name_str = None):
        '''解析 4.1.x 朋友圈列表项的 Name 拼接字符串，提取发布者、内容、时间。

        规则：
        - 从右向左匹配时间（见 parse_publish_time_41x 支持格式），匹配后剔除时间片段
        - 继续从右向左剔除系统提示（图片/视频/位置/分享等），保留核心文本
        - 最后从左向右按第一个空格切分：左为发布者，右为内容
        返回：{"publisher": str, "content": str, "time_str": str}
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def _check_interaction_history(publisher, content):
        '''检查是否已经互动过'''
        pass
    # WARNING: Decompyle incomplete

    
    def _save_moment_interaction(interaction_data):
        '''保存朋友圈互动记录'''
        pass
    # WARNING: Decompyle incomplete

    
    def SplitMessage(MsgItem, parse_file, save_pic = (False, False)):
        ui_Coder.SetGlobalSearchTimeout(0)
        MsgItemName = MsgItem.Name
        voice_text = None
        user_name = None
        file_info = None
        rect_info = None
        
        def find_controls_by_type(control = None, control_type = None, max_depth = None, current_depth = None):
            '''通用的控件遍历方法'''
            if current_depth >= max_depth:
                return []
            controls = None
            
            try:
                for child in control.GetChildren():
                    if child.ControlTypeName == control_type:
                        controls.append(child)
                    controls.extend(find_controls_by_type(child, control_type, max_depth, current_depth + 1))
            finally:
                pass
            return controls


    # WARNING: Decompyle incomplete

    
    def SplitMessage41x(MsgItem = None, parse_file = None, save_pic = None, account_info = (False, False, None, None), session_name = {
        'parse_file': bool,
        'save_pic': bool,
        'account_info': Optional[Dict],
        'session_name': Optional[str] }):
        """4.1.x 版本消息解析：根据 ClassName 区分类型，并通过截图判断发送者归属。

        返回结构与 SplitMessage 保持一致：
        (user_or_tag, content, runtime_id, file_info, voice_text, rect_info)
        - user_or_tag: 对方消息为当前会话名；本人消息为当前账户昵称或ID；系统/撤回/时间为 'SYS'/'Recall'/'Time'
        - content: MsgItem.Name 或经过必要处理后的实际内容
        - runtime_id: ''.join([str(i) for i in MsgItem.GetRuntimeId()])
        - file_info: 文件信息（当 parse_file=True 且为文件消息时）
        - voice_text: 语音转文本（若可识别）
        - rect_info: 微信4.1 版本消息头像截图区域的信息，用于区分发消息的人，-1 表示无法获取
        """
        ui_Coder.SetGlobalSearchTimeout(0)
        if not getattr(MsgItem, 'Name', ''):
            pass
        MsgItemName = ''
        if not getattr(MsgItem, 'ClassName', ''):
            pass
        class_name = ''
        voice_text = None
        file_info = None
        rect_info = None
        
        def _runtime_id_str(ctrl = None):
            pass
        # WARNING: Decompyle incomplete

        
        def _is_message_from_other(ctrl = None, variation_threshold = None):
            '''截图控件左上角 1/10 宽度的正方形区域，计算灰度标准差以判断颜色变化。'''
            pass
        # WARNING: Decompyle incomplete

    # WARNING: Decompyle incomplete

    
    def deep_search_avatars():
        '''
        使用TreeWalker深度遍历整个UI树
        '''
        wechat_window = ui_Coder.WindowControl('mmui::MainWindow', **('ClassName',))
        root_element = wechat_window.Element
        walker = ui_Coder.RawViewWalker
        avatars = []
        
        def walk_tree(element = None, depth = None):
            '''递归遍历UI树'''
            if depth > 20:
                return None
            control = ui_Coder.Control.CreateControlFromElement(element)
            print(f'''遍历元素: {control.ClassName} - {control.Name}''')
            if control.ClassName == 'mmui::ContactHeadView':
                avatars.append({
                    'name': control.Name,
                    'rect': control.BoundingRectangle })
            child = walker.GetFirstChildElement(element)
            if child:
                walk_tree(child, depth + 1)
                child = walker.GetNextSiblingElement(child)
        # WARNING: Decompyle incomplete

        walk_tree(root_element)
        return avatars

    
    def _download_network_file(url):
        '''下载网络文件到临时目录，支持文件缓存
        Args:
            url: 文件URL
        Returns:
            str: 临时文件的本地路径
        Raises:
            Exception: 下载失败时抛出异常
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def setClipboardFiles(paths):
        '''使用 Windows API 设置剪贴板 (修复内存对齐版)'''
        pass
    # WARNING: Decompyle incomplete

    
    def _parse_wx_time(time_str = None, current_time = None):
        '''
        解析微信时间显示格式为时间戳
        
        Args:
            time_str: 微信显示的时间文本 (如："12:30"、"昨天"、"星期一"等)
            current_time: 当前时间戳
            
        Returns:
            float: 消息时间戳，解析失败返回None
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def _parse_file_info(MsgItem, max_depth = (10,)):
