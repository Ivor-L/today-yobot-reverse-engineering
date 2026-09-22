# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: base_adapter.marshal (Python 3.9)

import aiohttp
import asyncio
from typing import Dict, Any, Optional, List
from WeRobotCore.utils.customer_api_config import CustomerAPIConfig
from WeRobotCore.utils.logger import get_logger
logger = get_logger('customer_api')

class APIError(Exception):
    '''API调用错误'''
    pass


class BaseAPIAdapter:
    '''客户API适配器基类'''
    
    def __init__(self = None, customer_id = None):
        self.customer_id = customer_id
        self.config = CustomerAPIConfig().get_customer_config(customer_id)
        if not self.config:
            raise ValueError(f'''客户 {customer_id} 配置不存在或未启用''')
        self.base_url = self.config.get('base_url', '')
        self.timeout = self.config.get('timeout', CustomerAPIConfig().get_global_config().get('timeout', 30))
        self.session = None

    
    async def _ensure_session(self):
        '''确保会话已初始化'''
        if self.session is None:
            self.session = aiohttp.ClientSession()

    
    async def close(self):
        '''关闭会话'''
        if self.session:
            await self.session.close()
            self.session = None

    
    def _get_auth_headers(self = None):
        '''获取认证头信息'''
        headers = { }
        auth = self.config.get('auth', { })
        auth_type = auth.get('type')
        if auth_type == 'bearer':
            headers['Authorization'] = f'''Bearer {auth.get('key', '')}'''
        elif auth_type == 'api_key':
            header_name = auth.get('header_name', 'X-API-Key')
            headers[header_name] = auth.get('key', '')
        elif auth_type == 'token':
            header_name = auth.get('header_name', 'token')
            headers[header_name] = auth.get('key', '')
        custom_headers = self.config.get('custom_headers', { })
        headers.update(custom_headers)
        return headers

    
    async def test_connection(self = None):
        '''测试API连接 - 使用HEAD请求，不获取实际数据'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _make_request(self = None, method = None, endpoint = None, **kwargs):
        '''发送API请求'''
        await self._ensure_session()
        url = f'''{self.base_url}{endpoint}'''
        headers = self._get_auth_headers()
        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))
        timeout = aiohttp.ClientTimeout(kwargs.pop('timeout', self.timeout), **('total',))
        log_data = {
            'method': method,
            'url': url,
            'headers': headers,
            'params': kwargs.get('params', { }),
            'json': kwargs.get('json', { }),
            'data': kwargs.get('data', { }) }
    # WARNING: Decompyle incomplete

    
    async def get_friends_data(self = None):
        '''获取好友数据'''
        raise NotImplementedError()

    
    async def add_friend(self = None, friend_data = None):
        '''添加好友'''
        raise NotImplementedError()


