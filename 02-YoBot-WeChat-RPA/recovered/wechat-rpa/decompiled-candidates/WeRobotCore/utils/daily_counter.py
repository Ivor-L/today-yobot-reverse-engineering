# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: daily_counter.marshal (Python 3.9)

import os
import json
import sys
from datetime import datetime
from typing import Dict, Any

class DailyCounter:
    
    def __init__(self):
        if getattr(sys, 'frozen', False):
            base_path = os.path.dirname(sys.executable)
        else:
            base_path = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        DataManager = DataManager
        import WeRobotCore.utils.data_manager
        self.data_file = os.path.join(DataManager.get_data_dir_str(), 'daily_friend_count.json')
        os.makedirs(os.path.dirname(self.data_file), True, **('exist_ok',))
        self._load_data()

    
    def _load_data(self = None):
        '''加载数据文件'''
        if os.path.exists(self.data_file):
            
            try:
                with open(self.data_file, 'r', 'utf-8', **('encoding',)) as f:
                    None(None, None, None)
                    return json.load(f)
                    with None:
                        if not None:
                            pass
            finally:
                pass
            return None
            return { }


    
    def _save_data(self = None, data = None):
        '''保存数据到文件'''
        print(f'''daily_friend_count保存: {data}''')
        with open(self.data_file, 'w', 'utf-8', **('encoding',)) as f:
            json.dump(data, f, False, 2, **('ensure_ascii', 'indent'))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def get_today_count(self = None, account_id = None):
        '''获取今日已添加的好友数量'''
        data = self._load_data()
        today = datetime.now().strftime('%Y%m%d')
        if account_id not in data or data[account_id]['day'] != today:
            return 0
        return None[account_id]['total']

    
    def increment_count(self = None, account_id = None):
        '''增加计数并返回新的计数值'''
        data = self._load_data()
        today = datetime.now().strftime('%Y%m%d')
        if account_id not in data or data[account_id]['day'] != today:
            data[account_id] = {
                'day': today,
                'total': 1 }
        else:
            data[account_id]['total'] += 1
        self._save_data(data)
        return data[account_id]['total']


