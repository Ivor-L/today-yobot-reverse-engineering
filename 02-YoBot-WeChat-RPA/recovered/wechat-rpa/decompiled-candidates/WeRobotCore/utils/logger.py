# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: logger.marshal (Python 3.9)

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, Dict, Any, List
_logs_root = Path('logs')
_managed_file_loggers = set()

def get_log_root():
    '''Return the process-owned log root without creating it.'''
    return _logs_root


def configure_log_root(logs_root = None):
    '''Bind one absolute product log root before managed handlers exist.'''
    global _logs_root
    if not isinstance(logs_root, Path) or logs_root.is_absolute():
        raise ValueError('logs_root must be an absolute pathlib.Path')
    if _managed_file_loggers and logs_root != _logs_root:
        raise RuntimeError('managed loggers are already bound to another root')
    _logs_root = logs_root
    task_logger.configure_logs_dir(logs_root)
    configure_task_log_root = configure_task_log_root
    import task_logger_v2
    configure_task_log_root(logs_root)


class TaskLogger:
    _instance = None
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    
    def __init__(self):
        if not self._initialized:
            self.logs_dir = get_log_root()
            self.chat_logs_file = self.logs_dir / 'chat_logs.json'
            self.mass_sending_logs_file = self.logs_dir / 'mass_sending_logs.json'
            self.moment_logs_file = self.logs_dir / 'moment_interactions.json'
            self.friend_request_logs_file = self.logs_dir / 'friend_request_logs.json'
            self.add_friend_logs_file = self.logs_dir / 'add_friend_logs.json'
            self.auto_follow_logs_file = self.logs_dir / 'auto_follow_logs.json'
            self.moment_post_logs_file = self.logs_dir / 'moment_post_logs.json'
            self._initialized = True

    
    def configure_logs_dir(self = None, logs_dir = None):
        if not isinstance(logs_dir, Path) or logs_dir.is_absolute():
            raise ValueError('logs_dir must be an absolute pathlib.Path')
        self.logs_dir = logs_dir
        self.chat_logs_file = self.logs_dir / 'chat_logs.json'
        self.mass_sending_logs_file = self.logs_dir / 'mass_sending_logs.json'
        self.moment_logs_file = self.logs_dir / 'moment_interactions.json'
        self.friend_request_logs_file = self.logs_dir / 'friend_request_logs.json'
        self.add_friend_logs_file = self.logs_dir / 'add_friend_logs.json'
        self.auto_follow_logs_file = self.logs_dir / 'auto_follow_logs.json'
        self.moment_post_logs_file = self.logs_dir / 'moment_post_logs.json'

    
    def _ensure_logs_dir(self = None):
        self.logs_dir.mkdir(True, True, **('parents', 'exist_ok'))

    
    def _load_logs(self = None, file_path = None):
        '''从指定文件加载日志，只返回最近48小时内的日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def add_friend_request_log(self, task_id = None, status = None, processed_count = None, tag = (None, None), error = {
        'task_id': str,
        'status': str,
        'processed_count': int,
        'tag': str,
        'error': str }):
        '''
        添加好友请求任务日志
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def add_friend_request_action_log(self, account_id = None, task_id = None, status = None, details = (None,), error_msg = {
        'account_id': str,
        'task_id': str,
        'status': str,
        'details': Dict[(str, Any)],
        'error_msg': str }):
        '''记录自动通过好友的V2版本日志'''
        task_logger_v2 = task_logger_v2
        import task_logger_v2
        task_logger_v2.add_log(account_id, 'friend_request', task_id, status, details, error_msg, **('account_id', 'task_type', 'task_id', 'status', 'details', 'error_msg'))

    
    def get_friend_request_logs(self = None):
        '''获取好友请求日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def _save_logs(self = None, logs = None, file_path = None):
        '''保存日志到指定文件'''
        self._ensure_logs_dir()
        with open(file_path, 'w', 'utf-8', **('encoding',)) as f:
            json.dump(logs, f, False, 2, **('ensure_ascii', 'indent'))
            None(None, None, None)
        with None:
            if not None:
                pass

    
    def add_chat_log(self, session_name, message, content = None, status = None, chat_type = None, error = (None, None), account_id = {
        'session_name': str,
        'message': str,
        'content': str,
        'status': str,
        'chat_type': str,
        'error': Optional[str],
        'account_id': Optional[str] }):
        '''添加自动回复日志'''
        logs = self._load_logs(self.chat_logs_file)
        log_entry = {
            'timestamp': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            'targetName': session_name,
            'content': content,
            'status': status,
            'error': error if error else None,
            'chatType': chat_type,
            'message': message,
            'account_id': account_id }
        logs.insert(0, log_entry)
        self._save_logs(logs[:500], self.chat_logs_file)
        return log_entry

    
    def _generate_random_id(self):
        '''生成随机ID'''
        import random
        import string
        return ''.join(random.choices(string.ascii_lowercase + string.digits, 9, **('k',)))

    
    def add_mass_sending_log(self = None, task_id = None, status = None, params = (None, None), error = {
        'task_id': str,
        'status': str,
        'params': Dict,
        'error': Optional[str] }):
        '''记录群发任务日志 (V2)'''
        task_logger_v2 = task_logger_v2
        import task_logger_v2
        account_id = 'unknown'
        if params and 'account_id' in params:
            account_id = params['account_id']
        if not params:
            pass
        task_logger_v2.add_log(account_id, 'mass_sending', task_id, status, { }, error, **('account_id', 'task_type', 'task_id', 'status', 'details', 'error_msg'))

    
    def add_chat_collection_log(self = None, task_id = None, status = None, params = (None, None), error = {
        'task_id': str,
        'status': str,
        'params': Dict,
        'error': Optional[str] }):
        '''添加聊天记录采集任务日志'''
        chat_collection_logs_file = self.logs_dir / 'chat_collection_logs.json'
        logs = self._load_logs(chat_collection_logs_file)
        log_entry = {
            'id': task_id,
            'timestamp': datetime.now().isoformat(),
            'type': 'chat_collection',
            'status': status,
            'params': params,
            'error': error }
        logs.insert(0, log_entry)
        self._save_logs(logs[:1000], chat_collection_logs_file)
        return log_entry

    
    def add_moment_log(self = None, content = None, status = None, error = (None,)):
        '''添加朋友圈互动日志'''
        logs = self._load_logs(self.moment_logs_file)
        log_entry = {
            'id': f'''moment_{datetime.now().timestamp()}''',
            'timestamp': datetime.now().isoformat(),
            'type': 'moment',
            'content': content,
            'status': status,
            'error': error }
        logs.insert(0, log_entry)
        self._save_logs(logs[:1000], self.moment_logs_file)
        return log_entry

    
    def add_auto_reply_action_log(self, account_id = None, task_id = None, status = None, details = (None,), error_msg = {
        'account_id': str,
        'task_id': str,
        'status': str,
        'details': Dict[(str, Any)],
        'error_msg': str }):
        '''记录单条原子化的自动回复日志 (V2)'''
        task_logger_v2 = task_logger_v2
        import task_logger_v2
        task_logger_v2.add_log(account_id, 'auto_reply', task_id, status, details, error_msg, **('account_id', 'task_type', 'task_id', 'status', 'details', 'error_msg'))

    
    def get_chat_logs(self = None):
        '''获取自动回复日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_mass_sending_logs(self = None):
        '''获取群发任务日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_chat_collection_logs(self = None):
        '''获取聊天采集任务日志'''
        chat_collection_logs_file = self.logs_dir / 'chat_collection_logs.json'
        return self._load_logs(chat_collection_logs_file)

    
    def get_moment_logs(self = None):
        '''获取朋友圈互动日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def add_moment_action_log(self, account_id = None, task_id = None, status = None, details = (None,), error_msg = {
        'account_id': str,
        'task_id': str,
        'status': str,
        'details': Dict[(str, Any)],
        'error_msg': str }):
        '''记录单条原子化的朋友圈互动日志'''
        task_logger_v2 = task_logger_v2
        import task_logger_v2
        task_logger_v2.add_log(account_id, 'moment_interaction', task_id, status, details, error_msg, **('account_id', 'task_type', 'task_id', 'status', 'details', 'error_msg'))

    
    def add_friend_log(self = None, task_id = None, processed_count = None, tags = (None, 0), attempt_count = {
        'task_id': str,
        'processed_count': int,
        'tags': str,
        'attempt_count': int }):
        '''
        添加自动添加好友任务日志
        
        Args:
            task_id: 任务ID
            processed_count: 成功数量
            tags: 打招呼话术
            attempt_count: 尝试总数
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def get_add_friend_logs(self = None):
        '''获取自动添加好友日志 (聚合转换)'''
        pass
    # WARNING: Decompyle incomplete

    
    def add_friend_action_log(self, account_id = None, task_id = None, status = None, details = (None,), error_msg = {
        'account_id': str,
        'task_id': str,
        'status': str,
        'details': Dict[(str, Any)],
        'error_msg': str }):
        '''记录单条原子化的加好友日志'''
        task_logger_v2 = task_logger_v2
        import task_logger_v2
        task_logger_v2.add_log(account_id, 'add_friend', task_id, status, details, error_msg, **('account_id', 'task_type', 'task_id', 'status', 'details', 'error_msg'))

    
    def log_auto_follow_execution(self = None, log_data = None):
        '''记录自动跟单任务执行日志 (已适配 V2 原子化日志)
        
        Args:
            log_data: 日志数据，包含：
                - task_id: 任务ID
                - friend_wxid: 好友微信ID
                - friend_name: 好友昵称
                - account_id: 微信账号ID
                - agent_id: 智能体ID
                - follow_scenario: 跟单场景
                - execution_time: 执行时间
                - success: 是否成功
                - generated_message: 生成的消息内容
                - error: 错误信息（如果有）
        '''
        pass
    # WARNING: Decompyle incomplete

    
    def get_auto_follow_logs(self = None):
        '''获取自动跟单日志'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_auto_follow_logs_by_friend(self = None, friend_wxid = None):
        '''根据好友微信ID获取跟单日志'''
        all_logs = self.get_auto_follow_logs()
        return (lambda .0 = None: [ log for log in .0 if log.get('friend_wxid') == friend_wxid ])(all_logs)

    
    def add_moment_post_log(self, task_id, status, folder_path = None, text = None, media_count = None, account = (None,), error = {
        'task_id': str,
        'status': str,
        'folder_path': str,
        'text': str,
        'media_count': int,
        'account': str,
        'error': Optional[str] }):
        logs = self._load_logs(self.moment_post_logs_file)
        log_entry = {
            'id': task_id,
            'timestamp': datetime.now().isoformat(),
            'type': 'moment_post',
            'status': status,
            'folder_path': folder_path,
            'text': text,
            'media_count': media_count,
            'account': account,
            'error': error }
        logs.insert(0, log_entry)
        self._save_logs(logs[:1000], self.moment_post_logs_file)
        return log_entry

    
    def get_moment_post_logs(self = None):
        return self._load_logs(self.moment_post_logs_file)

    __classcell__ = None

task_logger = TaskLogger()
import logging

def get_logger(name = None):
    '''
    获取指定名称的日志记录器
    
    Args:
        name: 日志记录器名称
        
    Returns:
        logging.Logger: 配置好的日志记录器
    '''
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    formatter = None.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    log_dir = get_log_root()
    log_dir.mkdir(True, True, **('parents', 'exist_ok'))
    file_handler = logging.FileHandler(log_dir / f'''{name}.log''', 'utf-8', **('encoding',))
    file_handler.setFormatter(formatter)
    import sys
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.setLevel(logging.INFO)
    file_handler.setLevel(logging.INFO)
    console_handler.setLevel(logging.INFO)
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    _managed_file_loggers.add(name)
    logger.propagate = False
    return logger

