# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: file.marshal (Python 3.9)

import os
import sys
import subprocess
from typing import Optional
import time
from fastapi import UploadFile, File, HTTPException
from fastapi.responses import FileResponse
import uiautomation as ui_Coder
from WeRobotCore.core.WeChatType import WeChat
from pathlib import Path
from WeRobotCore.utils.moment_material_manager import MomentMaterialManager
from WeRobotCore.utils.data_manager import DataManager
import csv
UPLOAD_DIR = os.path.join(DataManager.get_data_dir_str(), 'uploads', 'greetings')
os.makedirs(UPLOAD_DIR, True, **('exist_ok',))

async def save_uploaded_file(file = None, str_dir = None):
    '''保存上传的文件并返回保存路径'''
    pass
# WARNING: Decompyle incomplete


def send_file(wx = None, user = None, file = None):
    '''
    发送任意类型的文件
    :param user:
    :param file: 文件路径
    :return:
    '''
    result = wx.SendFiles(user, file, **('who', 'filepath'))
    if result:
        return {
            'success': True }
    return {
        'success': None,
        'message': '发送失败' }


def send_favorite(wx = None, user = None, keyword = None):
    '''
    向会话发送一条微信收藏记录（按关键词模糊搜索，多条取第一条）。
    用于发送提前收藏好的位置/定位卡片等。
    :param user: 目标会话
    :param keyword: 收藏记录搜索关键词
    '''
    return wx.SendFavorite(user, keyword, **('who', 'keyword'))


def list_moment_plans():
    base = DataManager.get_data_dir() / 'moment_material'
    base.mkdir(True, True, **('parents', 'exist_ok'))
    return (lambda .0: [ p.name for p in .0 if p.is_dir() ])(base.iterdir())


def list_moment_groups(plan_name = None):
    mgr = MomentMaterialManager()
    return mgr.list_groups(plan_name)


def select_moment_folder_and_groups(start_dir = None):
    pass
# WARNING: Decompyle incomplete


def open_folder(path = None):
    pass
# WARNING: Decompyle incomplete


def export_friend_list_file(status = None, tag = None):
    pass
# WARNING: Decompyle incomplete

