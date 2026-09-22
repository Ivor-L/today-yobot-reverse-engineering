# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: standard_adapter.marshal (Python 3.9)

from typing import Dict, Any, List, Optional
from base_adapter import BaseAPIAdapter, APIError

class StandardAPIAdapter(BaseAPIAdapter):
    '''标准API适配器实现'''
    
    async def get_friends_data(self = None):
        '''获取好友数据'''
        endpoint = self.config.get('endpoints', { }).get('get_friends')
        if not endpoint:
            raise APIError('未配置获取好友数据的端点')
        await self._make_request('GET', endpoint)
        result = <NODE:28>
        if isinstance(result, dict):
            if 'data' in result:
                return result['data']
            if None in result:
                return result['results']
            if None in result:
                return result['friends']
            if None(result, list):
                return result
            raise None(f'''无法解析API返回的好友数据格式: {result}''')

    
    async def add_friend(self = None, friend_data = None):
        '''添加好友'''
        endpoint = self.config.get('endpoints', { }).get('add_friend')
        if not endpoint:
            raise APIError('未配置添加好友的端点')
        await self._make_request('POST', endpoint, friend_data, **('json',))
        result = <NODE:28>
        return result


