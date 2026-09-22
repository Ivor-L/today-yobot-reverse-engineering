# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: agentic_service.marshal (Python 3.9)

'''私域 Agent（Agentic Provider Protocol / APP）适配器。

把任意实现了 APP 的 agent 提供方接入 RPA 的 AI service 层。
本机 Agent 客户端、代理商客户端或客户自建平台均可实现同一协议接入。

协议（同步/只消费 provider 只需前两个端点，异步模式增加第三个）：
    GET  {api_url}/v1/capabilities   -> 能力协商
    POST {api_url}/v1/chat           -> JSON 或 SSE 回复；也可仅确认接收
    GET  {api_url}/v1/jobs/{jobId}   -> 异步模式查询任务结果

本适配器是**薄转译**：把 RPA 现有的 context_messages + kwargs 原样转成 APP envelope，
不在适配器内重建会话。APP provider 可以按 memoryMode 维护自己的轻量上下文；
RPA 携带的历史是同步/冷启动种子，不再是唯一记忆来源。

APP 同步 SSE 支持显式两阶段回复：Provider 发送 ``phase: 1`` 后，可用 ``done``
直接结束，或返回终态 ``phase: 2``。未携带 ``phase`` 的旧接口仍按历史行为只读取第一条
``message`` 后关闭，不产生额外等待。耗时异步任务仍可使用 202 + jobId 模式。
'''
import asyncio
import hashlib
import json
import math
import os
import re
import uuid
from typing import Any, Awaitable, Callable, Dict, List, Optional
from urllib.parse import urlparse
import aiohttp
from aiohttp import ClientSession, ClientTimeout, TCPConnector
from ai_service_base import AIServiceBase
_LOGGER = None

def _logger():
    global _LOGGER
    if _LOGGER is None:
        UiaLogger = UiaLogger
        import core.uia_logger
        _LOGGER = UiaLogger('AgenticService', **('logger_name',)).get_logger()
    return _LOGGER

DEFAULT_TIMEOUT_SECONDS = 300
PHASE2_TIMEOUT_SECONDS = 300
MAX_SSE_EVENT_BYTES = 1048576
DEFAULT_RETRY_COUNT = 1
DELIVERY_MODES = {
    'consume_only',
    'sync_reply',
    'async_reply'}
RESPONSE_FORMATS = {
    'auto',
    'json',
    'sse'}
RETRYABLE_STATUSES = {
    408,
    425,
    429,
    500,
    502,
    503,
    504}
LOCAL_DOCUMENT_DEFAULT_MAX_FILES = 5
LOCAL_DOCUMENT_DEFAULT_MAX_FILE_BYTES = 10485760
LOCAL_DOCUMENT_DEFAULT_MAX_TOTAL_BYTES = 20971520
LOCAL_DOCUMENT_MIME = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }

def is_loopback_api_url(api_url = None):
    '''判断 provider 是否为本机地址。仅用于本地路径/HTTP 等安全策略。'''
    pass
# WARNING: Decompyle incomplete


def validate_api_url(api_url = None):
    '''校验并规范化 APP base URL。

    本机允许 HTTP；远程 provider 必须使用 HTTPS，避免 Bearer token 明文传输。
    '''
    if not api_url:
        pass
    value = ''.strip().rstrip('/')
    if not value:
        raise ValueError('私域Agent服务地址不能为空')
    parsed = urlparse(value)
    if not parsed.scheme not in frozenset({'https', 'http'}) or parsed.hostname:
        raise ValueError('私域Agent服务地址必须是有效的 http/https URL')
    if parsed.username and parsed.password and parsed.query or parsed.fragment:
        raise ValueError('私域Agent服务地址不能包含账号信息、查询参数或片段')
    if is_loopback_api_url(value) and parsed.scheme != 'https':
        raise ValueError('远程私域Agent服务必须使用 HTTPS')
    return value


def resolve_api_token(api_url = None, configured_token = None):
    '''解析 provider token；本机私域 Agent 可使用进程间托管令牌。'''
    if configured_token:
        return configured_token
    if None(api_url):
        if not os.environ.get('RPA_PRIVATE_AGENT_TOKEN'):
            pass
        return None


class AgenticService(AIServiceBase):
    
    def __init__(self = None, api_url = None, api_token = None, profile_id = None, timeout = None, delivery_mode = None, response_format = None, retry_count = None, outbox = None, async_store = None):
        self.api_url = validate_api_url(api_url)
        if not resolve_api_token(self.api_url, api_token):
            pass
        super().__init__('')
        self.profile_id = profile_id
        self.timeout = max(1, min(int(timeout), DEFAULT_TIMEOUT_SECONDS))
        self.delivery_mode = delivery_mode if delivery_mode in DELIVERY_MODES else 'sync_reply'
        self.response_format = response_format if response_format in RESPONSE_FORMATS else 'auto'
        self.retry_count = max(0, min(int(retry_count), 3))
        self.is_local_provider = is_loopback_api_url(self.api_url)
        self._outbox = outbox
        self._async_store = async_store
        self._session = None
        self._capabilities_task = None

    
    def session(self = None):
        if self._session is None or self._session.closed:
            headers = {
                'Content-Type': 'application/json' }
            if self.token:
                headers['Authorization'] = f'''Bearer {self.token}'''
            self._session = ClientSession(headers, TCPConnector(), ClientTimeout(None, min(self.timeout, 30), min(self.timeout, 30), max(self.timeout, PHASE2_TIMEOUT_SECONDS), **('total', 'connect', 'sock_connect', 'sock_read')), **('headers', 'connector', 'timeout'))
        return self._session

    session = None(session)
    
    async def close(self):
        if not self._session and self._session.closed:
            await self._session.close()

    
    async def _load_capabilities(self = None):
        '''Fail-closed capability negotiation for optional local document input.'''
        if not self.is_local_provider:
            return { }
    # WARNING: Decompyle incomplete

    
    async def _capabilities(self = None):
        if not self.is_local_provider:
            return { }
        if None._capabilities_task is None:
            self._capabilities_task = asyncio.create_task(self._load_capabilities())
    # WARNING: Decompyle incomplete

    
    def _positive_int(value = None, fallback = None, maximum = staticmethod):
        pass
    # WARNING: Decompyle incomplete

    _positive_int = None(_positive_int)
    
    async def _prepare_local_document_attachments(self = None, candidates = None):
        '''Only emit local paths after an explicit loopback capability opt-in.'''
        if not self.is_local_provider and isinstance(candidates, list) or candidates:
            return []
        await None._capabilities()
        caps = <NODE:28>
        input_caps = caps.get('inputAttachments')
        if isinstance(input_caps, dict) or str(input_caps.get('schemaVersion')) != '1':
            return []
        documents = None.get('documents')
        if not isinstance(documents, dict):
            return []
        transports = None.get('transports')
        extensions = documents.get('extensions')
        if isinstance(transports, list) or 'local_path' not in transports:
            return []
        if not None(extensions, list):
            return []
        supported = (lambda 