# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: task_logger_v2.marshal (Python 3.9)

import json
import uuid
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
import collections
import threading
_default_task_logs_root = Path.home() / '.yokowebot' / 'task_logs'

class TaskLoggerV2:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls = None):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            None(None, None, None)
        with None:
            if not None:
                pass
        return cls._instance

    
    def __init__(self):
        if not self._initialized:
            self.logs_dir = _default_task_logs_root
            self.logs_dir.mkdir(True, True, **('parents', 'exist_ok'))
            self.cache = collections.defaultdict((lambda : collections.deque(2000, **('maxlen',))))
            self._stats_cache = { }
            self._stats_cache_time = 0
            self._stats_lock = threading.Lock()
            self._load_recent_logs()
            self._initialized = True

    
    def configure_logs_dir(self = None, logs_dir = None):
        '''Bind the singleton to one process-owned absolute log directory.'''
        if not isinstance(logs_dir, Path) or logs_dir.is_absolute():
            raise ValueError('logs_dir must be an absolute pathlib.Path')
        with self._stats_lock:
            self.logs_dir = logs_dir
            self.logs_dir.mkdir(True, True, **('parents', 'exist_ok'))
            self.cache.clear()
            self._stats_cache.clear()
            self._stats_cache_time = 0
            self._load_recent_logs()
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def _get_log_file_path(self = None, task_type = None):
        return self.logs_dir / f'''{task_type}.jsonl'''

    
    def _load_recent_logs(self):
        '''启动时从所有 jsonl 文件中加载最近的日志到缓存'''
        if not self.logs_dir.exists():
            return None
    # WARNING: Decompyle incomplete

    
    def add_log(self, account_id, task_type = None, task_id = None, status = None, details = (None,), error_msg = {
        'account_id': str,
        'task_type': str,
        'task_id': str,
        'status': str,
        'details': Dict[(str, Any)],
        'error_msg': Optional[str] }):
        '''添加单条原子化操作日志'''
        log_id = str(uuid.uuid4())
        now = datetime.now()
        timestamp = int(time.time() * 1000)
        utc_plus_8 = timezone(timedelta(8, **('hours',)))
        created_at = now.astimezone(utc_plus_8).isoformat('milliseconds', **('timespec',))
        log_entry = {
            'id': log_id,
            'task_id': task_id,
            'account_id': account_id,
            'task_type': task_type,
            'timestamp': timestamp,
            'created_at': created_at,
            'status': status,
            'error_msg': error_msg,
            'details': details }
        self.cache[task_type].append(log_entry)
        file_path = self._get_log_file_path(task_type)
    # WARNING: Decompyle incomplete

    
    def get_logs(self = None, task_type = None, account_id = None):
        '''获取某种任务的缓存日志，按时间倒序'''
        logs = list(self.cache[task_type])
        if account_id:
            logs = (lambda .0 = None: [ log for log in .0 if log.get('account_id') == account_id ])(logs)
        logs.sort((lambda x: x.get('timestamp', 0)), True, **('key', 'reverse'))
        return logs

    
    async def get_today_stats_async(self = None, account_id = None):
        '''异步获取今日各项任务的成功执行统计数据'''
        import asyncio
        await asyncio.to_thread(self.get_today_stats, account_id)
        return <NODE:28>

    
    def get_today_stats(self = None, account_id = None):
        '''获取今日各项任务的成功执行统计数据'''
        now = datetime.now()
        current_time = time.time()
        cache_key = f'''stats_{account_id}''' if account_id else 'stats_all'
        with self._stats_lock:
            if current_time - self._stats_cache_time < 30 and cache_key in self._stats_cache:
                pass
            None(None, None, None)
            return None
            None(None, None, None)
        with None:
            if not None:
                pass
        today_start = datetime(now.year, now.month, now.day).astimezone(timezone(timedelta(8, **('hours',))))
        today_start_ts = int(today_start.timestamp() * 1000)
        stats = {
            'auto_reply': 0,
            'add_friend': 0,
            'friend_request': 0,
            'mass_sending': 0,
            'moment_interaction': 0,
            'auto_follow': 0 }
        if not self.logs_dir.exists():
            return stats
    # WARNING: Decompyle incomplete

    __classcell__ = None

task_logger_v2 = TaskLoggerV2()

def configure_task_log_root(logs_root = None):
    '''Place V2 task logs below the product-owned log root.'''
    if not isinstance(logs_root, Path) or logs_root.is_absolute():
        raise ValueError('logs_root must be an absolute pathlib.Path')
    task_logger_v2.configure_logs_dir(logs_root / 'task_logs')

