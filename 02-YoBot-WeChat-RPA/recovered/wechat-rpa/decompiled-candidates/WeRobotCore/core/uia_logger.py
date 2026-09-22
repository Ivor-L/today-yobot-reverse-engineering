# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: uia_logger.marshal (Python 3.9)

import logging
from pathlib import Path
from typing import Optional
from logging.handlers import RotatingFileHandler

class UiaLogger:
    '''UIA微信操作日志管理器'''
    
    def __init__(self = None, log_dir = None, logger_name = None):
        if log_dir is None:
            get_log_root = get_log_root
            import WeRobotCore.utils.logger
            self.log_dir = get_log_root() / 'uiauto'
        else:
            self.log_dir = Path(log_dir)
        self.log_dir.mkdir(True, True, **('parents', 'exist_ok'))
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        self.logger = logging.getLogger(logger_name)
        if self.logger.hasHandlers():
            for handler in self.logger.handlers:
                handler.close()
            self.logger.handlers.clear()
        file_handler = RotatingFileHandler(self.log_dir / 'wechat_operations.log', 10485760, 5, 'utf-8', **('maxBytes', 'backupCount', 'encoding'))
        file_handler.setFormatter(formatter)
        import sys
        self.console_handler = logging.StreamHandler(sys.stdout)
        self.console_handler.setFormatter(formatter)
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(self.console_handler)
        self.logger.propagate = False

    
    def get_logger(self = None):
        return self.logger

    
    def set_debug(self = None, debug = None):
        if debug:
            self.logger.setLevel(logging.DEBUG)
            self.console_handler.setLevel(logging.DEBUG)
        else:
            self.logger.setLevel(logging.INFO)
            self.console_handler.setLevel(logging.INFO)


