# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: fireflow_service.marshal (Python 3.9)

import json
import time
import requests
import os
import sys
from aiohttp import ClientSession, TCPConnector
from typing import Optional, Dict, Any, List
from datetime import datetime
from ai_service_base import AIServiceBase
DEFAULT_CHANNEL_ID = 'agent_generic'

def _get_cli_channel_id():
    '''Read both supported ``--channel-id`` command-line forms.'''
    for index, argument in enumerate(sys.argv):
        if argument == '--channel-id' and index + 1 < len(sys.argv):
            return sys.argv[index + 1]
        if None.startswith('--channel-id='):
            return argument.split('=', 1)[1]
        return None


def resolve_channel_id(channel_id = None):
    '''Resolve the Agent channel forwarded to Fireflow.

    YokoAgent starts the RPA process with ``YOKO_CHANNEL_ID``.  Keep the
    legacy official channel as a fallback for standalone/older launchers.
    ``VITE_CHANNEL_ID`` is accepted as a compatibility fallback because the
    Agent launcher also exposes that value to child processes.
    '''
    candidates = (channel_id, _get_cli_channel_id(), os.environ.get('YOKO_CHANNEL_ID'), os.environ.get('VITE_CHANNEL_ID'))
    for candidate in candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
        return DEFAULT_CHANNEL_ID


class FireflowService(AIServiceBase):
    
    def __init__(self = None, token = None, base_url = None, channel_id = None):
        super().__init__(token)
        self.base_url = base_url.rstrip('/')
        self.channel_id = resolve_channel_id(channel_id)
        self.headers = {
            'Authorization': f'''Bearer {token}''',
            'Content-Type': 'application/json',
            'x-channel-id': self.channel_id }
        print(f'''Fireflow channel: {self.channel_id}''')
        self._session = None

    
    def session(self = None):
        if self._session is None or self._session.closed:
            connector = TCPConnector(False, **('ssl',))
            self._session = ClientSession(self.headers, connector, **('headers', 'connector'))
        return self._session

    session = None(session)
    
    async def close(self):
        '''关闭aiohttp会话'''
        if not self._session and self._session.closed:
            await self._session.close()

    
    async def generate_comment(self, content, agent_id = None, session_id = None, user_name = None, session_name = (None, None, None, None), account_id = {
        'content': str,
        'agent_id': str,
        'session_id': str,
        'user_name': str,
        'session_name': str,
        'account_id': str,
        'return': Dict[(str, Any)] }):
        '''
        使用Fireflow智能体生成评论
        '''
        if session_id is not None:
            session_id = str(session_id)
        if account_id is not None:
            account_id = str(account_id)
    # WARNING: Decompyle incomplete

    
    def _clear_conversation_cache(self = None, session_id = None):
        '''清空指定会话的缓存'''
        conversations = self._load_conversations()
        if session_id in conversations:
            del conversations[session_id]
            self._save_conversations(conversations)
            print(f'''已清空会话缓存: {session_id}''')

    
    async def start_chat(self, agent_id, message, session_id, user_name = None, session_name = None, account_id = None, cache_session = (None, None, None, True, None), friend_tags = {
        'agent_id': str,
        'message': str,
        'session_id': str,
        'user_name': str,
        'session_name': str,
        'account_id': str,
        'cache_session': bool,
        'friend_tags': str,
        'return': Dict[(str, Any)] }):
        '''启动一个完整的对话流程'''
        if session_id is not None:
            session_id = str(session_id)
        if account_id is not None:
            account_id = str(account_id)
        max_retries = 3
    # WARNING: Decompyle incomplete

    
    async def upload_file(self = None, file_path = None, user_id = None):
        '''
        上传文件到Fireflow / 或在本地解析常见文档
        流程:
        1. 检查是否是可解析文档，如果是则本地解析提取文本并缓存
        2. 否则通过 /v1/oss/upload 换取预签名上传URL上传到OSS
        '''
        if not os.path.exists(file_path):
            return {
                'success': False,
                'error': f'''文件不存在: {file_path}''',
                'file_id': None,
                'url': None }
        file_name = os.path.basename(file_path)
        file_ext = os.path.splitext(file_path)[1].lower()
        if file_ext in ('.txt', '.md', '.csv', '.pdf', '.docx', '.xlsx', '.xls', '.json', '.xml'):
            DocumentExtractor = DocumentExtractor
            import utils.document_extractor
            extracted_text = DocumentExtractor.extract_text(file_path)
            if extracted_text:
                fake_id = f'''local_doc_{int(time.time() * 1000)}'''
                if not hasattr(self, '_extracted_texts'):
                    self._extracted_texts = { }
                if not hasattr(self, '_extracted_filenames'):
                    self._extracted_filenames = { }
                self._extracted_texts[fake_id] = extracted_text
                self._extracted_filenames[fake_id] = file_name
                print(f'''本地成功提取文档文本: {file_name}, 长度: {len(extracted_text)}''')
            return None
        None(f'''本地提取文档失败，退级走普通上传流程: {file_name}''')
        import mimetypes
        (content_type, _) = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        uid = user_id if user_id else f'''user_{int(time.time() * 1000)}'''
        oss_key = f'''temp/{uid}/{file_name}'''
        request_data = {
            'key': oss_key,
            'contentType': content_type }
        print(f'''请求上传预签名URL: {oss_key}''')
    # WARNING: Decompyle incomplete

    __classcell__ = None

