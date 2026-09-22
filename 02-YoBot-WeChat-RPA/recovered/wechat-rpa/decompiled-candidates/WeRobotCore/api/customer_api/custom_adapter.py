# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: custom_adapter.marshal (Python 3.9)

from typing import Dict, Any, List, Optional
from base_adapter import BaseAPIAdapter, APIError

class CustomAPIAdapter(BaseAPIAdapter):
    '''自定义API适配器实现'''
    
    async def get_friends_data(self = None):
        '''获取好友数据 - 自定义实现'''
        endpoint = self.config.get('endpoints', { }).get('get_friends')
        if not endpoint:
            raise APIError('未配置获取好友数据的端点')
        params = { }
        if 'query_params' in self.config:
            params.update(self.config['query_params'])
        await self._make_request('GET', endpoint, params, **('params',))
        result = <NODE:28>
        data_path = self.config.get('response_mapping', { }).get('friends_data_path', 'data')
        if isinstance(result, dict):
            current = result
            for key in data_path.split('.'):
                if key in current:
                    current = current[key]
                    continue
                raise APIError(f'''无法在响应中找到路径: {data_path}''')
            if isinstance(current, list):
                return current
            raise None('无法解析API返回的好友数据格式')

    
    async def add_friend(self = None, friend_data = None):
        '''添加好友 - 自定义实现'''
        endpoint = self.config.get('endpoints', { }).get('add_friend')
        if not endpoint:
            raise APIError('未配置添加好友的端点')
        field_mapping = self.config.get('request_mapping', { }).get('add_friend', { })
        mapped_data = { }
        for target_field, source_field in field_mapping.items():
            if source_field in friend_data:
                mapped_data[target_field] = friend_data[source_field]
                continue
            default_values = self.config.get('default_values', { }).get('add_friend', { })
            if target_field in default_values:
                mapped_data[target_field] = default_values[target_field]
                continue
                if not field_mapping:
                    mapped_data = friend_data
        await self._make_request('POST', endpoint, mapped_data, **('json',))
        result = <NODE:28>
        return result


