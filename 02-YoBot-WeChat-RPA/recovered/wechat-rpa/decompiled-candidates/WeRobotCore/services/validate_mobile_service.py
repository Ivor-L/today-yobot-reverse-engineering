# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: validate_mobile_service.marshal (Python 3.9)

from typing import Dict, List, Any, Optional
from WeRobotCore.api.customer_api.api_manager import CustomerAPIManager
from WeRobotCore.core.db_manager import WeChatDBManager as DBManager
from WeRobotCore.utils.logger import get_logger
from WeRobotCore.utils.config_manager import ConfigManager
from WeRobotCore.core.WeChatType import WeChat
logger = get_logger('validate_mobile_service')

class ValidateMobileService:
    '''待验真号码服务'''
    
    def __init__(self):
        self.api_manager = CustomerAPIManager()
        self.db_manager = DBManager()
        self.config_manager = None

    
    def _get_config_manager(self = None):
        '''获取配置管理器实例'''
        if self.config_manager is None:
            
            try:
                wechat_type = WeChat()
                account_id = wechat_type.account_info.get('account_id')
                if account_id:
                    self.config_manager = ConfigManager(account_id)
                else:
                    self.config_manager = ConfigManager()
            finally:
                pass
            self.config_manager = ConfigManager()
            return self.config_manager


    
    async def sync_mobile_list(self = None, customer_id = None):
        '''从客户API同步待验真号码到本地数据库'''
        pass
    # WARNING: Decompyle incomplete


