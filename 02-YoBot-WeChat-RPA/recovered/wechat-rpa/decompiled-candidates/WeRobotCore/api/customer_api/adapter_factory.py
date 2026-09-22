# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: adapter_factory.marshal (Python 3.9)

from typing import Dict, Type
from base_adapter import BaseAPIAdapter
from standard_adapter import StandardAPIAdapter
from custom_adapter import CustomAPIAdapter
from WeRobotCore.utils.customer_api_config import CustomerAPIConfig
from validate_mobile_adapter import ValidateMobileAdapter

class APIAdapterFactory:
    '''API适配器工厂'''
    _adapter_types: Dict[(str, Type[BaseAPIAdapter])] = {
        'standard': StandardAPIAdapter,
        'custom': CustomAPIAdapter,
        'validate_mobile': ValidateMobileAdapter }
    
    def register_adapter(cls = None, api_type = None, adapter_class = classmethod):
        '''注册新的适配器类型'''
        cls._adapter_types[api_type] = adapter_class

    register_adapter = None(register_adapter)
    
    def create_adapter(cls = None, customer_id = None):
        '''创建适配器实例'''
        config = CustomerAPIConfig().get_customer_config(customer_id)
        if not config:
            raise ValueError(f'''客户 {customer_id} 配置不存在或未启用''')
        api_type = config.get('api_type', 'standard')
        if api_type not in cls._adapter_types:
            raise ValueError(f'''未知的API类型: {api_type}''')
        adapter_class = cls._adapter_types[api_type]
        return adapter_class(customer_id)

    create_adapter = None(create_adapter)

