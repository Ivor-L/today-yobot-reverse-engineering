# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_reply_task.marshal (Python 3.9)

from email import message
import hashlib
import os
import re
from typing import Dict, Any, Optional, List
from datetime import datetime
from base import BaseTask, TaskType, TaskPriority, TaskStatus
from utils.message_processor import MessageProcessor
from utils.logger import TaskLogger
import asyncio
import json
from services.coze_service import CozeService
from websocket_manager import websocket_manager
from services.ai_service_factory import AIServiceFactory
from services.ai_service_base import AIServiceBase
from core.uia_logger import UiaLogger
from core.version_detector import detect_version, WeChatVersion
from utils.message_splitter import split_text_message
from application.auto_reply import AutoReplyAccountRuntime, AutoReplyHistoryRecorder, AutoReplyRuntimeConfiguration, AutoReplyTaskHistoryStore, AutoReplyTextSender, AutoReplyMediaSender, AutoReplyGroupMentionSender, GreetingMessageSender, LegacyAutoReplyAccountRuntimeFactory, require_account_runtime, require_runtime_configuration, require_task_history_store
from application.session_identity import normalize_session_key
from domain import ErrorCode, OperationResult
STATELESS_CONTEXT_COUNT = 16
AGENTIC_PHASE_MIN_INTERVAL_SECONDS = 3
TRANSFER_NO_CHANNEL_ALERT_INTERVAL_SECONDS = 1800
_transfer_no_channel_last_alert_at = 0
AGENTIC_LOCAL_DOCUMENT_MIME = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }

def _get_legacy_chat_api():
    '''Resolve the mature Windows chat facade only when a legacy action runs.'''
    chat = chat
    import api
    return chat


def _is_transfer_phrase_hit(reply = None, transfer_phrases = None):
    '''Return True when a non-empty transfer phrase appears in a non-empty reply.'''
    if not reply:
        pass
    reply_text = str('').strip()
    if not reply_text:
        return False
    if not None:
        pass
    for phrase in []:
        if not phrase:
            pass
        phrase_text = str('').strip()
        if phrase_text and phrase_text in reply_text:
            return True
        return False


class AutoReplyTask(BaseTask):
    _image_path_cache: Dict[(str, List[str])] = { }
    _IMAGE_CACHE_MAX = 200
    
    def __init__(self = None, task_id = None, params = None, account_id = None, schedule_time = None, account_runtime = None, runtime_configuration = None, global_configuration = None, task_history_store = None):
        super().__init__(task_id, TaskType.AUTO_REPLY, params, schedule_time, TaskPriority.MEDIUM if params.get('is_group') else TaskPriority.HIGH, **('task_id', 'task_type', 'params', 'schedule_time', 'priority'))
        self.account_id = account_id
        self.account_runtime = require_account_runtime(account_runtime) if account_runtime is not None else LegacyAutoReplyAccountRuntimeFactory().for_account(account_id)
        self.message_processor = MessageProcessor()
        self.config_manager = require_runtime_configuration(runtime_configuration) if runtime_configuration is not None else self._legacy_config_manager(account_id)
        self._global_config_manager = require_runtime_configuration(global_configuration) if global_configuration is not None else None
        self._task_history_store = require_task_history_store(task_history_store) if task_history_store is not None else None
        self.task_logger = TaskLogger()
        self.logger = UiaLogger('AutoReplyTask', **('logger_name',)).get_logger()
        self.message_num = params.get('message_num', 1)
        self.file_info = None
        self.pending_messages = []
        self.max_concurrent_requests = 5
        self._coze_semaphore = asyncio.Semaphore(1)
        self.require_confirmation = params.get('require_confirmation', False)
        self.confirmation_timeout = params.get('confirmation_timeout', 30)
        self.auto_send_on_timeout = params.get('auto_send_on_timeout', True)
        self.confirmation_event = asyncio.Event()
        self.confirmed_content = None
        self.confirmation_action = None
        self._pending_image_history = []
        self._text_sender = None
        self._media_sender = None
        self._greeting_sender = None
        self._group_mention_sender = None
        self._history_recorder = None
        self._resolved_group_senders = { }
        self._mention_state = None
        self._mention_send_blocked = False
        self._reply_quote_consumed = False

    
    def _legacy_config_manager(account_id):
        '''Load the Windows compatibility config only for an unbound task.'''
        ConfigManager = ConfigManager
        import utils.config_manager
        return ConfigManager(account_id)

    _legacy_config_manager = staticmethod(_legacy_config_manager)
    
    def bind_runtime_dependencies(self = None, *, account_runtime, runtime_configuration, global_configuration, task_history_store):
        '''Replace Legacy process globals before a queued task executes.'''
        if self.status not in {
            TaskStatus.PENDING}:
            raise RuntimeError('runtime dependencies cannot be rebound after task execution starts')
        if account_runtime is not None:
            self.account_runtime = require_account_runtime(account_runtime)
        if runtime_configuration is not None:
            self.config_manager = require_runtime_configuration(runtime_configuration)
        if global_configuration is not None:
            self._global_config_manager = require_runtime_configuration(global_configuration)
        if task_history_store is not None:
            self._task_history_store = require_task_history_store(task_history_store)

    
    def _get_global_configuration(self = None):
        configuration = getattr(self, '_global_config_manager', None)
        if configuration is None:
            configuration = self._legacy_config_manager(None)
            self._global_config_manager = configuration
        return require_runtime_configuration(configuration)

    
    def bind_text_sender(self = None, sender = None):
        '''Bind the standard reply text writer before this task executes.'''
        if not sender is None or isinstance(sender, AutoReplyTextSender):
            raise TypeError('sender must implement AutoReplyTextSender')
        if self._text_sender is not None and self._text_sender is not sender:
            raise RuntimeError('text sender is already bound to this task')
        self._text_sender = sender

    
    def bind_media_sender(self = None, sender = None):
        '''Bind standard image/file delivery before this task executes.'''
        if not sender is None or isinstance(sender, AutoReplyMediaSender):
            raise TypeError('sender must implement AutoReplyMediaSender')
        if self._media_sender is not None and self._media_sender is not sender:
            raise RuntimeError('media sender is already bound to this task')
        self._media_sender = sender

    
    def bind_greeting_sender(self = None, sender = None):
        '''Bind the existing platform-neutral greeting-group delivery port.'''
        if not sender is None or isinstance(sender, GreetingMessageSender):
            raise TypeError('sender must implement GreetingMessageSender')
        if self._greeting_sender is not None and self._greeting_sender is not sender:
            raise RuntimeError('greeting sender is already bound to this task')
        self._greeting_sender = sender

    
    def bind_group_mention_sender(self = None, sender = None):
        '''Bind the platform-native one-shot group mention transaction.'''
        if not sender is None or isinstance(sender, AutoReplyGroupMentionSender):
            raise TypeError('sender must implement AutoReplyGroupMentionSender')
        if self._group_mention_sender is not None and self._group_mention_sender is not sender:
            raise RuntimeError('group mention sender is already bound to this task')
        self._group_mention_sender = sender

    
    def bind_history_recorder(self = None, recorder = None):
        '''Bind the post-reply history refresh dependency before execution.'''
        if not recorder is None or isinstance(recorder, AutoReplyHistoryRecorder):
            raise TypeError('recorder must implement AutoReplyHistoryRecorder')
        if self._history_recorder is not None and self._history_recorder is not recorder:
            raise RuntimeError('history recorder is already bound to this task')
        self._history_recorder = recorder

    
    def _has_prepared_mention(self = None):
        state = getattr(self, '_mention_state', None)
        if state and state.get('status') == 'prepared':
            pass
        return bool(state.get('draft'))

    
    def _result_success(result = None):
        if isinstance(result, OperationResult):
            return result.success
        if result:
            pass
        return None(result.get('success', False))

    _result_success = None(_result_success)
    
    def _result_data(result = None):
        if isinstance(result, OperationResult):
            return dict(result.data)
        if not result:
            pass
        return None({ })

    _result_data = None(_result_data)
    
    def _result_message(result = None):
        if isinstance(result, OperationResult):
            if not result.message:
                pass
            return result.code.value
        if not None:
            pass
        value = { }
        if not value.get('message') and value.get('error'):
            pass
        return str('')

    _result_message = None(_result_message)
    
    def _with_result_data(result, **values):
        if isinstance(result, OperationResult):
            data = dict(result.data)
            data.update(values)
            if result.success:
                return OperationResult.succeeded(result.message, result.verified, data, **('verified', 'data'))
            return None.failed(result.code, result.message, result.retryable, data, **('retryable', 'data'))
        if not result:
            pass
        result = None({ })
        result.update(values)
        return result

    _with_result_data = staticmethod(_with_result_data)
    
    def _preferred_mention_target_id(self = None, messages = None):
        '''Choose the final plausible incoming message before costly UI work.'''
        if not messages:
            pass
        for item in reversed([]):
            sender = item.get('sender', { }).get('name', '')
            if item.get('isSelf', False) or sender in ('Recall', 'SYS', 'GREET'):
                continue
            if not item.get('content'):
                pass
            content = str('')
            if ('通过了你的朋友验证' in content or '我通过了' in content) and '开始聊天' in content:
                continue
            message_id = item.get('id')
            if message_id not in (None, ''):
                return str(message_id)
            return None

    
    async def _prepare_group_mention(self = None, message = None):
        message_id = message.get('id') if isinstance(message, dict) else None
        session_id = self.params.get('session_id')
        if not self.params.get('session_name'):
            pass
        session_name = self.params.get('user_name')
        if not message_id in (None, '') and session_id or session_name:
            return {
                'success': False,
                'prepared': False,
                'message': '缺少@回复定位信息' }
        sender = None(self, '_group_mention_sender', None)
        if sender is not None:
            await sender.prepare(self.account_id, normalize_session_key(session_id), str(message_id), **('account_id', 'session_id', 'message_id'))
            result = <NODE:28>
        else:
            chat = _get_legacy_chat_api()
            prepare = getattr(chat, 'async_prepare_group_mention', None)
            if not callable(prepare):
                return {
                    'success': False,
                    'prepared': False,
                    'message': '当前运行时未提供群成员@回复' }
            await None(session_name, str(message_id), self.account_id, **('user', 'msg_id', 'account_id'))
            result = <NODE:28>
        data = self._result_data(result)
        if self._result_success(result) and data.get('prepared') and data.get('draft'):
            self._mention_send_blocked = False
            self._mention_state = {
                'status': 'prepared',
                'session_name': session_name,
                'session_id': normalize_session_key(session_id),
                'target_message_id': str(message_id),
                'sender_name': data.get('sender'),
                'draft': data.get('draft'),
                'prepared_at': asyncio.get_running_loop().time() }
            self.logger.info('已预置群成员@回复: session=%s, msg_id=%s, sender=%s', session_name, message_id, data.get('sender'))
        elif data.get('blocked') or data.get('preserved'):
            self._mention_send_blocked = True
            self.logger.warning('群成员@预置检测到人工草稿，已阻止本轮自动发送: session=%s, msg_id=%s, error=%s', session_name, message_id, self._result_message(result))
        else:
            self.logger.warning('群成员@预置失败，将按普通回复继续: session=%s, msg_id=%s, error=%s', session_name, message_id, self._result_message(result))
        return result

    
    async def _cleanup_prepared_mention(self = None, reason = None):
        if not self._has_prepared_mention():
            return None
        state = None._mention_state
        sender = getattr(self, '_group_mention_sender', None)
        if sender is not None:
            await sender.clear(self.account_id, state['session_id'], state['draft'], **('account_id', 'session_id', 'expected_draft'))
            result = <NODE:28>
        else:
            chat = _get_legacy_chat_api()
            cleaner = getattr(chat, 'async_clear_prepared_group_mention', None)
            if not callable(cleaner):
                state['status'] = 'stale'
                return None
            await None(state['session_name'], state['draft'], self.account_id, **('user', 'expected_draft', 'account_id'))
            result = <NODE:28>
        data = self._result_data(result)
        if self._result_success(result):
            pass
        cleared = data.get('cleared', True)
        state['status'] = 'cancelled' if cleared else 'stale'
        if cleared:
            if not reason:
                pass
            self.logger.info('已清理未消费的群成员@草稿: reason=%s', 'task-finalize')
        elif not reason:
            pass
        '未清理群成员@草稿（可能存在人工输入）: reason=%s, error=%s'(reason, 'task-finalize', self._result_message(result))

    
    async def _ensure_group_mention_target(self = None, message = None):
        if getattr(self, '_mention_send_blocked', False):
            return None
        target_id = None if not None else message.get('id')
        target_id = None if target_id in (None, '') else str(target_id)
        state = getattr(self, '_mention_state', None)
        if self._has_prepared_mention() and state.get('target_message_id') == target_id:
            return None
        if None._has_prepared_mention():
            await self._cleanup_prepared_mention('mention-target-changed')
        if target_id and message:
            await self._prepare_group_mention(message)

    
    def _rendered_texts(result = None, fallback = None):
        data = AutoReplyTask._result_data(result)
        texts = []
        if not data.get('rendered_messages', []):
            pass
        for item in []:
            if not isinstance(item, dict) and item.get('type') == 'text' or item.get('content'):
                pass
            content = str('')
            if content:
                texts.append(content)
                continue
                if not texts:
                    if not data.get('rendered_texts', []):
                        pass
                    texts = (lambda .0: [ str(value) for value in .0 if str(value) ])([])
        if not data.get('rendered_content') and data.