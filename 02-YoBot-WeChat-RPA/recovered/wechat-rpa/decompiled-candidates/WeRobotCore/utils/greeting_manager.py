# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: greeting_manager.marshal (Python 3.9)

import asyncio
import random
from typing import Dict, List, Optional, Any
from config_manager import ConfigManager
from utils.message_processor import MessageProcessor
from application.auto_reply.greeting_sender import FavoriteGreetingMessageSender, GreetingMessageSender
from WeRobotCore.task_system_v3.unified_manager_pattern import get_auto_reply_manager
from message_splitter import split_text_message
import hashlib

class GreetingManager:
    '''话术组管理类，统一处理话术组的相关逻辑'''
    
    def __init__(self = None, config_manager = None, message_sender = None):
        if not config_manager:
            pass
        self.config_manager = ConfigManager()
        if not message_sender is not None and isinstance(message_sender, GreetingMessageSender):
            raise TypeError('message_sender must implement GreetingMessageSender')
        self.message_sender = message_sender
        self.message_processor = MessageProcessor()
        self.auto_reply_manager = get_auto_reply_manager()

    
    async def get_greeting_group(self = None, greeting_group_id = None):
        '''获取指定ID的话术组'''
        pass
    # WARNING: Decompyle incomplete

    
    async def execute_greeting_group(self, greeting_group_id = None, target_user = None, session_id = None, wechat = (None, None, None), account_id = {
        'greeting_group_id': str,
        'target_user': str,
        'session_id': str,
        'wechat': Any,
        'account_id': str,
        'return': bool }):
        '''执行话术组发送任务'''
        pass
    # WARNING: Decompyle incomplete

    
    async def execute_direct_text(self, text = None, target_user = None, wechat = None, session_id = (None, None, None), account_id = {
        'text': str,
        'target_user': str,
        'wechat': Any,
        'session_id': str,
        'account_id': str,
        'return': bool }):
        '''执行"直接预设文本"群发（Agent 拟定好的文案，不走话术组配置）。

        构造一条临时文本话术，复用与话术组完全相同的内发送循环，因此防自动回复缓存、
        随机延迟、单条异常隔离等行为与话术组路径一致。

        个性化：文本中的 {name} 占位符按收件人名替换（收件人名即发送循环里的 target_user，
        零额外成本）。未包含占位符时按纯文本原样发送。
        '''
        if not text:
            pass
        content = ''.replace('{name}', target_user)
        greetings = [
            {
                'type': 'text',
                'content': content }]
        await self._execute_greetings(greetings, target_user, session_id, wechat, account_id)
        return <NODE:28>

    
    async def _execute_greetings(self, greetings = None, target_user = None, session_id = None, wechat = (None, None, None), account_id = {
        'greetings': List[Dict],
        'target_user': str,
        'session_id': str,
        'wechat': Any,
        'account_id': str,
        'return': bool }):
        '''话术项发送内循环（话术组与直接文本共用，保证行为一致）。'''
        success = True
    # WARNING: Decompyle incomplete

    
    async def _send_text_greeting(self, wechat = None, target_user = None, greeting = None, account_id = (None, None), session_id = {
        'wechat': Any,
        'target_user': str,
        'greeting': Dict,
        'account_id': str,
        'session_id': str,
        'return': bool }):
        '''发送文本话术'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _send_file_greeting(self, wechat = None, target_user = None, greeting = None, account_id = (None, None), session_id = {
        'wechat': Any,
        'target_user': str,
        'greeting': Dict,
        'account_id': str,
        'session_id': str,
        'return': bool }):
        '''发送文件话术'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _send_voice_greeting(self = None, wechat = None, target_user = None, greeting = {
        'wechat': Any,
        'target_user': str,
        'greeting': Dict,
        'return': bool }):
        '''
        发送语音话术。失败一律返回 False；调用方继续下一条话术，**不回退**到文本/文件。

        守门链：
        1) audioPath 字段存在且文件存在
        2) 微信版本 >= (4,1,9)
        3) chat.async_send_voice 成功
        任一不满足都跳过本条。
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def _send_favorite_greeting(self, wechat = None, target_user = None, greeting = None, account_id = (None, None), session_id = {
        'wechat': Any,
        'target_user': str,
        'greeting': Dict,
        'account_id': str,
        'session_id': str,
        'return': bool }):
        '''
        发送收藏话术（按关键词搜索微信收藏并发送，如定位卡片）。失败一律返回 False，不回退。

        守门链：
        1) favoriteKeyword 字段存在且非空
        2) 微信版本 >= (4,1,9)（与语音话术一致：收藏发送依赖 4.1.x mmui 控件）
        3) wx.SendFavorite 成功
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def _send_agent_greeting(self, target_user = None, greeting = None, session_id = None, wechat = (None, None, None), account_id = {
        'target_user': str,
        'greeting': Dict,
        'session_id': str,
        'wechat': Any,
        'account_id': str,
        'return': bool }):
        '''发送智能体生成的话术'''
        pass
    # WARNING: Decompyle incomplete

    
    def _build_message_content(self = None, content = None):
        '''构建消息内容'''
        return {
            'role': 'user',
            'content': content,
            'content_type': 'text' }

    
    def validate_greeting_group(self = None, greeting_group = None):
        '''验证话术组格式'''
        if not isinstance(greeting_group, dict):
            return False
        if not None not in greeting_group or isinstance(greeting_group['greetings'], list):
            return False
        for greeting in None['greetings']:
            if isinstance(greeting, dict) or 'type' not in greeting:
                return False
            greeting_type = None['type']
            if greeting_type == 'text' or 'content' not in greeting:
                return False
            if greeting_type == 'file' or 'filePath' not in greeting:
                return False
            if greeting_type == 'voice' or 'audioPath' not in greeting:
                return False
            if not greeting_type == 'favorite' or greeting.get('favoriteKeyword'):
                return False
            if greeting_type == 'agent' or 'agentId' not in greeting:
                return False
            return False
        return True


