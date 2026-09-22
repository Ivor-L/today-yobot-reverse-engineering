# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: data_manager.marshal (Python 3.9)

import os
import shutil
import sys
from pathlib import Path
import logging
logger = logging.getLogger(__name__)

class DataManager:
    _instance = None
    _initialized = False
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super(DataManager, cls).__new__(cls)
        return cls._instance

    
    def __init__(self):
        if not self._initialized:
            self.global_data_dir = Path.home() / '.webot' / 'data'
            self._init_data_dir()
            self._initialized = True

    
    def _get_local_data_dir(self = None):
        '''获取旧版本本地的 data 目录路径'''
        if getattr(sys, 'frozen', False):
            base_path = Path(sys.executable).parent
        else:
            base_path = Path(os.getcwd())
        return base_path / 'data'

    
    def _init_data_dir(self):
        '''初始化全局数据目录，包含复制旧数据的逻辑'''
        if self.global_data_dir.exists():
            return None
        local_data_dir = None._get_local_data_dir()
        self.global_data_dir.parent.mkdir(True, True, **('parents', 'exist_ok'))
    # WARNING: Decompyle incomplete

    
    def get_data_dir(cls = None):
        '''获取全局数据目录的绝对路径对象'''
        return cls().global_data_dir

    get_data_dir = None(get_data_dir)
    
    def get_data_dir_str(cls = None):
        '''获取全局数据目录的绝对路径字符串'''
        return str(cls().global_data_dir)

    get_data_dir_str = None(get_data_dir_str)
    __classcell__ = None


def get_global_data_dir():
    return DataManager.get_data_dir()

