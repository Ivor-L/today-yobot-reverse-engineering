# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_follow_task.marshal (Python 3.9)

'''
自动跟单任务 - Task System V2

实现对指定好友的自动跟进功能，通过Coze智能体生成个性化话术并发送消息。
'''
from datetime import datetime, timezone, timedelta
import asyncio
import random
import hashlib
from typing import Dict, Any, Optional
from base import TimedBaseTask, TaskType, TaskPriority, TaskStatus
from core.WeChatType import WeChat
from api import chat, file
from utils.logger import TaskLogger
from utils.config_manager import ConfigManager
from websocket_manager import websocket_manager
from services.ai_service_factory import AIServiceFactory
from utils.message_processor import MessageProcessor
from WeRobotCore.task_system_v3.unified_manager_pattern import get_auto_reply_manager
from utils.message_splitter import split_text_message
MAX_FLAT_HISTORY_MESSAGES = 40
MAX_FLAT_HISTORY_CHARS = 12000

class AutoFollowTask(TimedBaseTask):
    '''自动跟单任务
    
    负责对指定好友发送智能体生成的跟进话术，
    支持个性化消息生成和多种消息类型发送。
    '''
    
    def __init__(self = None, task_id = None, params = None, schedule_time = None, schedule_config = None, is_recurring = None):
        '''初始化自动跟单任务
        
        Args:
            task_id: 任务ID
            params: 任务参数，包含：
                - friend_wxid: 好友微信ID
                - friend_name: 好友昵称
                - account_id: 微信账号ID
                - agent_id: Coze智能体ID
                - follow_scenario: 跟单场景（如：新好友）
            schedule_time: 调度时间
            schedule_config: 调度配置
            is_recurring: 是否为循环任务
        '''
        required_params = [
            'friend_wxid',
            'friend_name',
            'account_id',
            'agent_id']
        for param in required_params:
            if not params.get(param):
                raise ValueError(f'''缺少必需参数: {param}''')
        super().__init__(task_id, TaskType.AUTO_FOLLOW, params, schedule_time, TaskPriority.MEDIUM, schedule_config, is_recurring, **('task_id', 'task_type', 'params', 'schedule_time', 'priority', 'schedule_config', 'is_recurring'))
        self.task_logger = TaskLogger()
        self.config_manager = ConfigManager()
        self.message_processor = MessageProcessor()
        self.id = task_id
        self.error = None
        self.friend_wxid = params['friend_wxid']
        self.friend_name = params['friend_name']
        self.account_id = params['account_id']
        self.agent_id = params['agent_id']
        self.wechat = WeChat(self.account_id)
        self.follow_scenario = params.get('follow_scenario', '新好友')
        self.chat_type = params.get('chat_type', 'single')
        self.metadata = params.get('metadata', { })
        self.follow_day = self._calculate_follow_day()
        print(f'''初始化自动跟单任务: {self.friend_name}({self.friend_wxid})，所属账号{self.account_id}，第{self.follow_day}天跟进''')

    
    async def execute(self = None):
        '''执行跟单任务'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _send_follow_message(self = None, chat_messages = None):
        '''发送跟进消息'''
        pass
    # WARNING: Decompyle incomplete

    
    def _calculate_follow_day(self = None):
        '''计算当前跟进天数
        
        根据执行统计信息计算当前是第几天跟进：
        1. 优先使用执行次数(execution_count)来确定已跟进的天数，当前跟进天数 = 执行次数 + 1
        2. 如果无法获取执行次数，则使用next_execution_day作为备选
        3. 如果metadata为空或无法计算，则默认为第1天跟进
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def _build_follow_prompt(self = None):
        '''构建跟进提示词
        
        根据跟单场景和跟进天数生成不同的提示词，如果无法确定跟进天数，则使用兜底提示词
        '''
        has_valid_follow_day = self.follow_day > 0
        if self.chat_type == 'group':
            if has_valid_follow_day:
                base_prompt = f'''请生成群聊{self.friend_name}第{self.follow_day}天的运营话术'''
            else:
                base_prompt = f'''请生成群聊{self.friend_name}的运营话术'''
                print('无法确定跟进天数，使用兜底提示词')
        elif has_valid_follow_day:
            base_prompt = f'''请生成客户{self.friend_name}第{self.follow_day}天的跟单话术'''
        else:
            base_prompt = f'''请生成针对客户{self.friend_name}的跟单话术'''
            print('无法确定跟进天数，使用兜底提示词')
        return base_prompt

    
    def _build_message_content(self = None, content = None):
        '''构建消息内容'''
        return {
            'role': 'user',
            'content': content,
            'content_type': 'text' }

    
    def _build_flat_context(self = None, chat_messages = None, prompt = None):
        '''拍平上下文：把整段历史按时间顺序拼成一段纯文本，连同任务作为单条 user 消息发出。

        某些平台/模型对"历史字段(history)"是略读的——当结尾是我方消息、且历史里对方消息很短时，
        模型容易漏看对方发言而误判（典型：把已经回复/提过问的候选人当成失联，误发再触达话术）。
        把完整对话拍平进单条 query 可强制模型通读，经实测能消除这类漏读。是否启用由 agent 配置
        启用条件见 _send_follow_message（fireflow 平台）。我方(本账号)消息标[我方]，非我方标[对方]。
        顺序与 _build_context_messages 一致（保序：输入即时间正序 旧→新）。
        为防止模型输入 token 超限，按 MAX_FLAT_HISTORY_MESSAGES / MAX_FLAT_HISTORY_CHARS 截断，
        优先保留最近的消息（从新到旧累计，超限即停），并在开头标注省略。'''
        all_lines = []
        if not chat_messages:
            pass
        for hist_msg in []:
            hist_sender_name = hist_msg.get('sender', { }).get('name')
            hist_content = hist_msg.get('content', '')
            if not hist_content:
                continue
            if hist_msg.get('isSelf', False):
                pass
            is_self = hist_sender_name != 'Recall'
            if hist_content in ('[图片]', '[文件]', '[视频]', '[语音]'):
                if is_self:
                    continue
                hist_content = f'''（发送了{hist_content}）'''
            all_lines.append(f'''{'[我方]' if is_self else '[对方]'} {hist_content}''')
        kept = []
        used_chars = 0
        for line in reversed(all_lines):
            if len(kept) >= MAX_FLAT_HISTORY_MESSAGES:
                pass
            elif used_chars + len(line) > MAX_FLAT_HISTORY_CHARS and kept:
                pass
            else:
                kept.append(line)
                used_chars += len(line) + 1
            kept.reverse()
            truncated = len(kept) < len(all_lines)
            if kept:
                convo = '\n'.join(kept)
                if truncated:
                    convo = '（更早的聊天记录已省略）\n' + convo
                else:
                    convo = '（暂无任何聊天记录）'
        text = f'''【群内完整聊天记录（从进群到现在，按时间先后）】\n{convo}\n\n【任务】{prompt}'''
        return [
            self._build_message_content(text)]

    
    def _build_context_messages(self = None, chat_messages = None, prompt = None, flatten = (False,)):
        '''构建完整的上下文消息

        设计说明：跟进进度的判定（如"对方是否已提交所需材料/资料"）完全交给跟单智能体
        从对话上下文中按【内容】去分析，代码不再注入"除本账号外是否有他人发过消息"这类
        基于 isSelf 的权威布尔事实。原因：真实群里除机器人外还可能有人工顾问/其他助理用各自
        账号发言，仅凭 isSelf 无法把"队友"和"候选人/客户"区分开；一刀切地把"有非我消息"当成
        "对方已回复/已推进"会造成误判（典型：顾问用私人手机发的空白资料模板被当成候选人已交
        资料，从而误判 SKIP）。正确做法是把完整对话原样交给智能体，由提示词规则按内容判断
        "上下文里是否出现了候选人实际填写的个人资料"（详见 Coze 提示词，不区分发送方）。

        flatten=True 时改用拍平格式（见 _build_flat_context），用于规避 fireflow 模型对历史短消息
        的弱注意力（由调用方按 platform==fireflow 决定）。'''
        if flatten:
            return self._build_flat_context(chat_messages, prompt)
        context_messages = None
        if chat_messages:
            for hist_msg in reversed(chat_messages):
                hist_sender_name = hist_msg.get('sender', { }).get('name')
                hist_content = hist_msg.get('content', '')
                if not hist_content:
                    continue
                if hist_msg.get('isSelf', False):
                    pass
                is_self = hist_sender_name != 'Recall'
                if hist_content in ('[图片]', '[文件]', '[视频]', '[语音]'):
                    if is_self:
                        continue
                    hist_content = f'''（对方发送了{hist_content}）'''
                if is_self:
                    context_messages.insert(0, {
                        'role': 'assistant',
                        'content': hist_content,
                        'type': 'answer',
                        'content_type': 'text' })
                    continue
                context_messages.insert(0, {
                    'role': 'user',
                    'content': hist_content,
                    'content_type': 'text' })
        context_messages.append(self._build_message_content(prompt))
        return context_messages

    
    async def _load_local_history_context(self = None, account_id = None, max_count = None):
        '''读取本地保存的历史会话作为上下文（更长上下文）。

        - 单聊、群聊均启用：群跟单场景下目标常是"对方所在的准一对一群"，
          同样需要跨多屏的历史来判断"是否已回复/已发资料"；群内多人噪声由跟单智能体提示词做语义去噪。
          本地历史由自动回复 / 仅监控记录员落库，群会话也会被记录。
        - 返回结构与顺序与 UIA 一屏读取保持一致：嵌套 sender.name、按时间正序（旧→新），
          可直接交给 _build_context_messages，无需再调整顺序（该方法对输入顺序是保序的）。
        - 读不到（会话改名/从未记录）返回空列表，由调用方回退到一屏读取。
        '''
        if not account_id:
            return []
        ChatHistoryManager = ChatHistoryManager
        import WeRobotCore.utils.chat_history
        chat_history = ChatHistoryManager(account_id)
        await chat_history.load_history(self.friend_name)
        history = <NODE:28>
        if not history:
            pass
        return None
        recent = history[-max_count:]
        normalized = []
        for m in recent:
            normalized.append({
                'content': m.get('content', ''),
                'isSelf': m.get('isSelf', False),
                'sender': {
                    'name': m.get('sender_name', '') },
                'fingerprint': m.get('fingerprint', ''),
                'timestamp': m.get('timestamp') })
        print(f'''自动跟单：命中本地历史会话 {self.friend_name}，读取 {len(normalized)} 条上下文''')
        :
            if not account_id:
                return []
            ChatHistoryManager = ChatHistoryManager
            import WeRobotCore.utils.chat_history
            chat_history = ChatHistoryManager(account_id)
            await chat_history.load_history(self.friend_name)
            history = <NODE:28>
            if not history:
                pass
            return None
            recent = history[-max_count:]
            normalized = []
            for m in recent:
                normalized.append({
                    'content': m.get('content', ''),
                    'isSelf': m.get('isSelf', False),
                    'sender': {
                        'name': m.get('sender_name', '') },
                    'fingerprint': m.get('fingerprint', ''),
                    'timestamp': m.get('timestamp') })
            print(f'''自动跟单：命中本地历史会话 {self.friend_name}，读取 {len(normalized)} 条上下文''')
            
            return normalized
        return normalized
    # WARNING: Decompyle incomplete

    
    def _generate_session_id(self = None):
        '''生成会话ID'''
        LicenseManager = LicenseManager
        import utils.license_manager
    # WARNING: Decompyle incomplete

    
    async def _send_parsed_message(self = None, reply = None):
        '''解析并发送消息'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _broadcast_task_status(self):
        '''广播任务状态'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _save_execution_log(self = None, success = None, error = None):
        '''保存执行日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def _resolve_local_file(self = None, key = None):
        '''根据文件库key查找本地文件路径，找不到返回None'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _handle_missing_local_file(self = None, key = None):
        '''文件库文件缺失时，通过WebSocket通知前端引导用户补充'''
        print(f'''文件库中未找到key=\'{key}\'，会话={self.friend_name}''')
    # WARNING: Decompyle incomplete

    __classcell__ = None

