# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: alert_notifier.marshal (Python 3.9)

import smtplib
from email.mime.text import MIMEText
from email.header import Header
from typing import Optional
import time
from dataclasses import dataclass
from uia_logger import UiaLogger
logger = UiaLogger().get_logger()
EmailConfig = dataclass(<NODE:12>)
email_config = EmailConfig('aibot001@qq.com', 'teupnhixxeerbhbf', 'smtp.qq.com', 465, '', **('sender', 'password', 'smtp_server', 'smtp_port', 'receiver'))

class AlertNotifier:
    '''预警通知管理器'''
    _instance = None
    
    def __new__(cls = None, email_config = None):
        if cls._instance is None:
            cls._instance = super(AlertNotifier, cls).__new__(cls)
            cls._instance.email_config = email_config
            cls._instance.error_start_time = None
            cls._instance.last_error_time = None
            cls._instance.error_count = 0
            cls._instance.alert_sent = False
            cls._instance.last_alert_time = 0
            cls._instance.check_task_running = False
        return cls._instance

    
    def __init__(self = None, email_config = None):
        pass

    
    def schedule_connection_check(self, wechat_instance):
        '''
        创建一个延迟检查任务，60秒后检查微信窗口状态
        
        Args:
            wechat_instance: WeChat实例
        '''
        if self.check_task_running:
            return None
        import threading
        import time
        logger.info('微信窗口不存在,启动定时预警任务，倒计时60秒...')
        
        def delayed_check():
            self.check_task_running = True
            time.sleep(60)
            status = wechat_instance.check_connection_status()
            if not status.get('connected', False):
                logger.warning('未探测到WeChat窗口，发送预警邮件')
                self.send_alert_email()

        check_thread = threading.Thread(delayed_check, **('target',))
        check_thread.daemon = True
        check_thread.start()

    
    def check_error(self = None, error = None):
        '''
        检查错误并在需要时发送预警
        
        Args:
            error: 捕获到的异常
        '''
        current_time = time.time()
        if self.error_start_time is None:
            self.error_start_time = current_time
            self.last_error_time = current_time
            self.error_count = 1
            logger.warning('检测到UIA断开连接错误，开始监控...')
            return None
        time_since_last_error = None - self.last_error_time
        self.last_error_time = current_time

    
    def reset_monitor(self = None):
        '''重置错误监控状态'''
        self.error_start_time = None
        self.last_error_time = None
        self.error_count = 0
        self.alert_sent = False

    
    def send_alert_email(self = None):
        '''发送预警（改为飞书通知）'''
        pass
    # WARNING: Decompyle incomplete

    __classcell__ = None

