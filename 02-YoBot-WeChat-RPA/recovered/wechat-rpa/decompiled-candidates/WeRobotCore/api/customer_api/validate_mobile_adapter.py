# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: validate_mobile_adapter.marshal (Python 3.9)

from typing import Dict, Any, List, Optional
from base_adapter import BaseAPIAdapter, APIError
from WeRobotCore.utils.logger import get_logger
import time
logger = get_logger('validate_mobile')

class ValidateMobileAdapter(BaseAPIAdapter):
    '''待验真号码API适配器实现'''
    
    async def get_friends_data(self = None, start_time = None):
        '''获取待验真号码列表
        
        Args:
            start_time: 开始时间戳（毫秒级），用于增量查询
        '''
        endpoint = self.config.get('endpoints', { }).get('get_friends')
        if not endpoint:
            raise APIError('当前客户未配置获取名单列表的端口')
        headers = self._get_auth_headers()
        request_data = { }
        if start_time is not None:
            request_data['startTime'] = start_time
            logger.info(f'''使用增量查询，startTime: {start_time}''')
        else:
            logger.info('首次查询，未提供startTime参数')
        await self._make_request('POST', endpoint, headers, request_data, **('headers', 'json'))
        result = <NODE:28>
        print(result)
        data_list = None
        if isinstance(result, dict):
            if 'data' in result:
                data_list = result['data']
            else:
                raise APIError(f'''无法在返回结果中找到数据字段: {result}''')
        elif isinstance(result, list):
            data_list = result
        else:
            raise APIError(f'''无法解析API返回的号码数据格式: {result}''')
        if not isinstance(data_list, list):
            raise APIError(f'''数据字段不是列表格式: {data_list}''')
        mapping = self.config.get('response_mapping', { })
        wxid_field = mapping.get('wxid_field', 'mobile')
        remark_field = mapping.get('remark_field', 'noteName')
        tags_field = mapping.get('tags_field', 'tag')
        friend_list = []
        for item in data_list:
            wxid = item.get(wxid_field, '')
            if wxid:
                friend = {
                    'wxid': wxid,
                    'remark': item.get(remark_field, ''),
                    'tags': item.get(tags_field, '') }
                friend_list.append(friend)
            else:
                logger.warning(f'''跳过wxid为空的数据: {item}''')
        logger.info(f'''从API获取到 {len(friend_list)} 条数据''')
        return friend_list

    
    async def add_friend(self = None, friend_data = None):
        '''添加好友 - 此API不支持此操作'''
        raise APIError('待验真号码API不支持添加好友操作')


