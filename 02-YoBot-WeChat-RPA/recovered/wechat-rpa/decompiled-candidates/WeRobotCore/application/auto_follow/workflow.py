# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: workflow.marshal (Python 3.9)

'''Windows-parity automatic follow-up business workflow.

Scheduling and task control remain in the established V3 adapter.  This
module owns only the platform-neutral execution of one follow-up occurrence.
'''
from __future__ import annotations
import asyncio
import hashlib
from typing import Any, Dict, Iterable, List, Mapping
from WeRobotCore.services.ai_service_factory import AIServiceFactory
from WeRobotCore.utils.message_processor import MessageProcessor
from WeRobotCore.utils.message_splitter import split_text_message
from runtime import AutoFollowRuntime
MAX_FLAT_HISTORY_MESSAGES = 40
MAX_FLAT_HISTORY_CHARS = 12000
_SKIP_REPLIES = frozenset(('SKIP', 'NOREPLY', 'NO_REPLY', '无需跟进'))

class AutoFollowWorkflow:
    '''Execute one AI follow-up while keeping native actions behind a port.'''
    
    def __init__(self = None, runtime = None, *, ai_service_factory, message_processor_factory, sleeper):
        if not isinstance(runtime, AutoFollowRuntime):
            raise TypeError('runtime must implement AutoFollowRuntime')
        if not callable(ai_service_factory) or callable(message_processor_factory):
            raise TypeError('workflow factories must be callable')
        if not callable(sleeper):
            raise TypeError('sleeper must be callable')
        self._runtime = runtime
        self._ai_service_factory = ai_service_factory
        self._message_processor_factory = message_processor_factory
        self._sleeper = sleeper

    
    def _required(value = None, field = None):
        if not value:
            pass
        normalized = str('').strip()
        if not normalized:
            raise ValueError('{} must be non-empty text'.format(field))
        return normalized

    _required = None(_required)
    
    def _follow_day(metadata = None):
        value = metadata.get('execution_stats', { }).get('execution_count', 0)
        if not value:
            pass
        return max(1, int(0) + 1)

    _follow_day = None(_follow_day)
    
    def _prompt(cls = None, metadata = None, name = classmethod, chat_type = {
        'metadata': 'Mapping[str, Any]',
        'name': 'str',
        'chat_type': 'str',
        'return': 'str' }):
        day = cls._follow_day(metadata)
        if chat_type == 'group':
            return '请生成群聊{}第{}天的运营话术'.format(name, day)
        return None.format(name, day)

    _prompt = None(_prompt)
    
    def _is_self(message = None):
        if not message.get('sender'):
            pass
        sender = { }
        sender_name = sender.get('name', '') if isinstance(sender, Mapping) else ''
        if message.get('isSelf', False):
            pass
        return bool(sender_name != 'Recall')

    _is_self = None(_is_self)
    
    def _role_context(cls = None, messages = None, prompt = classmethod):
        result = []
        if not messages:
            pass
        for message in ():
            if not message.get('content'):
                pass
            content = str('').strip()
            if not content:
                continue
            is_self = cls._is_self(message)
            if content in ('[图片]', '[文件]', '[视频]', '[语音]'):
                if is_self:
                    continue
                content = '（对方发送了{}）'.format(content)
            if is_self:
                result.append({
                    'role': 'assistant',
                    'content': content,
                    'type': 'answer',
                    'content_type': 'text' })
                continue
            result.append({
                'role': 'user',
                'content': content,
                'content_type': 'text' })
        result.append({
            'role': 'user',
            'content': prompt,
            'content_type': 'text' })
        return result

    _role_context = None(_role_context)
    
    def _flat_context(cls = None, messages = None, prompt = classmethod):
        lines = []
        if not messages:
            pass
        for message in ():
            if not message.get('content'):
                pass
            content = str('').strip()
            if not content:
                continue
            is_self = cls._is_self(message)
            if content in ('[图片]', '[文件]', '[视频]', '[语音]'):
                if is_self:
                    continue
                content = '（发送了{}）'.format(content)
            lines.append('{} {}'.format('[我方]' if is_self else '[对方]', content))
        kept = []
        used = 0
        for line in reversed(lines):
            if len(kept) >= MAX_FLAT_HISTORY_MESSAGES:
                pass
            elif kept and used + len(line) > MAX_FLAT_HISTORY_CHARS:
                pass
            else:
                kept.append(line)
                used += len(line) + 1
            kept.reverse()
        conversation = '\n'.join(kept) if kept else '（暂无任何聊天记录）'
        if len(kept) < len(lines):
            conversation = '（更早的聊天记录已省略）\n' + conversation
        return [
            {
                'role': 'user',
                'content_type': 'text',
                'content': '【群内完整聊天记录（从进群到现在，按时间先后）】\n{}\n\n【任务】{}'.format(conversation, prompt) }]

    _flat_context = None(_flat_context)
    
    def _session_id(account_id = None, name = None):
        digest = hashlib.md5('{}_{}'.format(name, account_id).encode('utf-8')).hexdigest()
        return str(int(digest[:8], 16) & 2147483647)

    _session_id = None(_session_id)
    
    def _service_config(configuration = None, platform = None):
        if platform == 'coze':
            config = configuration.get_cached_config('coze_settings')
            if not config:
                raise ValueError('未配置 Coze 设置')
            return config
        if None == 'dify':
            config = configuration.get_cached_config('dify_settings')
            if not config:
                raise ValueError('未配置 Dify 设置')
            return config
        if None in ('coze3', 'fireflow', 'agentic'):
            return { }
        raise None('不支持的智能体平台: {}'.format(platform))

    _service_config = None(_service_config)
    
    def _bounded_text_parts(content = None, split_mode = None):
        parts = []
        for None in split_text_message(content, split_mode):
            configured = None
        return (lambda .0: [ part for part in .0 if part ])(parts)

    _bounded_text_parts = None(_bounded_text_parts)
    
    async def _send_reply(self = None, *, account_id, session_id, session_name, reply, configuration):
        parsed = self._message_processor_factory().parse_message(reply)
        success = True
        for component in parsed.components:
            if component.type == 'text':
                parts = self._bounded_text_parts(component.content, configuration.get_auto_split_mode())
                for index, part in enumerate(parts):
                    await self._runtime.message_sender.send_text(account_id, session_id, part)
                    result = <NODE:28>
                    if not result.success:
                        success = False
                        continue
                    await self._runtime.cache_outgoing(session_name, part)
                    if index + 1 < len(parts):
                        await self._sleeper(0.5)
                        continue
                    elif component.type in ('image', 'file'):
                        method = self._runtime.message_sender.send_image if component.type == 'image' else self._runtime.message_sender.send_file
                        await method(account_id, session_id, component.content)
                        result = <NODE:28>
                        if result.success:
                            await self._runtime.cache_outgoing(session_name, '[图片]' if component.type == 'image' else '[文件]')
                        else:
                            success = False
                    elif component.type == 'local_file':
                        path = self._runtime.resolve_local_file(component.content)
                        if not path:
                            success = False
                        else:
                            await self._runtime.message_sender.send_file(account_id, session_id, path)
                            result = <NODE:28>
                            if result.success:
                                await self._runtime.cache_outgoing(session_name, '[文件]')
                            else:
                                success = False
                    else:
                        success = False
            await self._sleeper(0.5)
        return success

    
    async def execute(self = None, metadata = None):
        friend = metadata.get('friend_info', { })
        strategy = metadata.get('execution_strategy', { })
        task_config = metadata.get('task_config', { })
        account_id = self._required(friend.get('account_id'), 'account_id')
        name = self._required(friend.get('name'), 'friend_name')
        agent_id = self._required(task_config.get('agent_id'), 'agent_id')
        if not friend.get('chat_type'):
            pass
        chat_type = str('single').strip().lower()
        if chat_type not in ('single', 'group'):
            raise ValueError('chat_type must be single or group')
        await self._runtime.is_account_online(account_id)
        if not <NODE:28>:
            return {
                'success': False,
                'error': '微信账号未连接',
                'message': '' }
        await None._runtime.resolve_conversation(account_id, name, chat_type)
        session = <NODE:28>
        await self._runtime.load_history(account_id, name, 30)
        history = <NODE:28>
        if not history:
            await self._runtime.read_current_messages(account_id, session.session_id, 15)
            history = <NODE:28>
        configuration = self._runtime.configuration_for(account_id)
        agent_info = configuration.get_agent_by_id(agent_id)
        if not agent_info:
            return {
                'success': False,
                'error': '未找到智能体信息: {}'.format(agent_id),
                'message': '' }
        if not agent_info.get('platform'):
            pass
        platform = None('coze').lower()
        config = self._service_config(configuration, platform)
        service = self._ai_service_factory(platform, config, dict(agent_info))
        if service is None:
            return {
                'success': False,
                'error': '智能体服务创建失败',
                'message': '' }
        prompt = None._prompt(metadata, name, chat_type)
        context = self._flat_context(history, prompt) if platform == 'fireflow' else self._role_context(history, prompt)
        
        try:
            AgenticService = AgenticService
            import WeRobotCore.services.agentic_service
            if isinstance(service, AgenticService):
                await service.start_chat(agent_id, context, self._session_id(account_id, name), name, name, account_id, True, 'follow_up', **('user_name', 'session_name', 'account_id', 'cache_session', 'scene'))
                response = <NODE:28>
            else:
                await service.start_chat(agent_id, context, self._session_id(account_id, name), name, name, account_id, False, **('user_name', 'session_name', 'account_id', 'cache_session'))
                response = <NODE:28>
        finally:
            await service.close()
        await service.close()
        if not response.get('success'):
            if not response.get('error'):
                pass
            return {
                'success': False,
                'error': str('生成跟单话术失败'),
                'message': '' }
        if not response.get('reply'):
            pass

        reply = None('')
        normalized = reply.strip().strip('[]【】').upper()
        if reply.strip() or normalized in _SKIP_REPLIES:
            return {
                'success': True,
                'message': '[无需跟进]',
                'error': '' }
        await None._send_reply(account_id, session.session_id, name, reply, configuration, **('account_id', 'session_id', 'session_name', 'reply', 'configuration'))
        sent = <NODE:28>
    # WARNING: Decompyle incomplete


__all__ = [
    'AutoFollowWorkflow']
