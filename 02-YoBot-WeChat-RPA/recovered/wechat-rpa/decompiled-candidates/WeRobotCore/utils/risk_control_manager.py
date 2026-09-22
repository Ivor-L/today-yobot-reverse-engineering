# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: risk_control_manager.marshal (Python 3.9)

import json
import os
from datetime import datetime, timedelta
import pytz
from enum import Enum
from pathlib import Path
from WeRobotCore.utils.data_manager import DataManager

class RiskControlType(Enum):
    ADD_FRIEND_FREQUENT = 'ADD_FRIEND_FREQUENT'


class RiskControlManager:
    _instance = None
    
    def __new__(cls = None, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(RiskControlManager, cls).__new__(cls)
            cls._instance._init()
        return cls._instance

    
    def _init(self):
        data_dir = DataManager.get_data_dir_str()
        self.record_file = os.path.join(data_dir, 'risk_control_records.jsonl')
        self.tz = pytz.timezone('Asia/Shanghai')

    
    def add_record(self = None, account_id = None, risk_type = None, remark = ('',)):
        '''
        记录风控违规信息
        :param account_id: 微信账号
        :param risk_type: 风控类型
        :param remark: 备注说明
        '''
        record = {
            'time': datetime.now(self.tz).strftime('%Y-%m-%d %H:%M:%S'),
            'risk_type': risk_type.value if isinstance(risk_type, Enum) else risk_type,
            'account_id': account_id,
            'remark': remark }
        with open(self.record_file, 'a', 'utf-8', **('encoding',)) as f:
            f.write(json.dumps(record, False, **('ensure_ascii',)) + '\n')
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def get_recent_records(self = None, hours = None):
        '''
        获取最近N小时内的风控记录
        :param hours: 小时数，默认24
        '''
        if not os.path.exists(self.record_file):
            return []
        records = None
        cutoff_time = datetime.now(self.tz) - timedelta(hours, **('hours',))
    # WARNING: Decompyle incomplete

    
    def is_account_restricted(self = None, account_id = None, risk_type = None, hours = (24,)):
        '''
        判断指定账号在最近N小时内是否触发了指定的风控
        :param account_id: 微信账号
        :param risk_type: 风控类型
        :param hours: 小时数，默认24
        '''
        records = self.get_recent_records(hours, **('hours',))
        risk_value = risk_type.value if isinstance(risk_type, Enum) else risk_type
        for record in records:
            if record.get('account_id') == account_id and record.get('risk_type') == risk_value:
                return True
            return False

    __classcell__ = None

