# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: api_manager.marshal (Python 3.9)

from typing import Dict, Any, List, Optional
import asyncio
from adapter_factory import APIAdapterFactory
from base_adapter import BaseAPIAdapter
from WeRobotCore.utils.customer_api_config import CustomerAPIConfig

class CustomerAPIManager:
    '''客户API管理器'''
    _instance = None
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super(CustomerAPIManager, cls).__new__(cls)
            cls._instance._adapters = { }
        return cls._instance

    
    async def get_adapter(self = None, customer_id = None):
        '''获取客户API适配器'''
        if customer_id in self._adapters:
            return self._adapters[customer_id]
        adapter = None.create_adapter(customer_id)
        self._adapters[customer_id] = adapter
        return adapter

    
    async def close_all(self):
        '''关闭所有适配器连接'''
        close_tasks = []
        for adapter in self._adapters.values():
            close_tasks.append(adapter.close())
    # WARNING: Decompyle incomplete

    
    async def get_friends_data(self = None, customer_id = None, start_time = None):
        '''获取指定客户的好友数据
        
        Args:
            customer_id: 客户ID
            start_time: 开始时间戳（毫秒级），用于增量查询
        '''
        await self.get_adapter(customer_id)
        adapter = <NODE:28>
        await adapter.get_friends_data(start_time)
        return <NODE:28>

    
    async def add_friend(self = None, customer_id = None, friend_data = None):
        '''通过指定客户的API添加好友'''
        await self.get_adapter(customer_id)
        adapter = <NODE:28>
        await adapter.add_friend(friend_data)
        return <NODE:28>

    
    def get_available_customers(self = None):
        '''获取所有可用的客户列表'''
        return CustomerAPIConfig().get_all_enabled_customers()

    __classcell__ = None

