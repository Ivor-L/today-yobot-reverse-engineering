# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_moments.marshal (Python 3.9)

'''Legacy Vue AI Moments API over the process-owned macOS manager.'''
from __future__ import annotations
import hmac
from datetime import datetime
from pathlib import Path
import shutil
import subprocess
from typing import Any, Dict, Mapping, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.application.moment_post import MOMENT_MAX_MEDIA_FILES, MOMENT_MEDIA_SUFFIXES
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from WeRobotCore.utils.logger import task_logger
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_moments_installed'

class MacOSAgentPostMomentRequest(BaseModel):
    material_folder: 'str' = ''
    content: 'str' = ''
    files: 'Optional[list[str]]' = None
    account_id: 'Optional[str]' = Field(None, 'accountId', **('default', 'alias'))
    model_config = ConfigDict(True, **('populate_by_name',))


def _safe_plan_name(value = None):
    if not value:
        pass
    name = str('').strip()
    if name and name in frozenset({'.', '..'}) and '/' in name and '\\' in name or len(name) > 128:
        raise ValueError('素材计划名称无效')
    return name


def _default_folder_selector():
    result = subprocess.run([
        'osascript',
        '-e',
        'POSIX path of (choose folder with prompt "请选择朋友圈素材计划文件夹")'], False, True, True, 120, **('check', 'capture_output', 'text', 'timeout'))
    if result.returncode != 0:
        return ''
    return None.stdout.strip().rstrip('/')


def _default_folder_opener(path = None):
    subprocess.Popen([
        'open',
        str(path)], subprocess.DEVNULL, subprocess.DEVNULL, subprocess.DEVNULL, True, **('stdin', 'stdout', 'stderr', 'start_new_session'))


def create_macos_mvp_moments_router(*, manager, configuration_factory, gateway, api_key, post_manager, material_root, folder_selector, folder_opener):
    for method in ('toggle_moment_comment_task', 'get_all_tasks'):
        if not callable(getattr(manager, method, None)):
            raise TypeError('manager must expose {}()'.format(method))
    if not callable(configuration_factory):
        raise TypeError('configuration_factory must be callable')
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be non-empty text')
    if post_manager is not None:
        for method in ('create_tasks', 'post_moment_direct', 'get_tasks', 'cancel_task'):
            if not callable(getattr(post_manager, method, None)):
                raise TypeError('post_manager must expose {}()'.format(method))
        if not isinstance(material_root, Path) or material_root.is_absolute():
            raise ValueError('material_root must be an absolute pathlib.Path')
        if not callable(folder_selector) or callable(folder_opener):
            raise TypeError('folder adapters must be callable')
    header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented = None):
        if not presented:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, {
                'code': 'MACOS_MVP_API_KEY_INVALID',
                'message': 'invalid API key' }, **('status_code', 'detail'))
        return presented

    router = APIRouter()
    
    async def toggle_auto_comment(settings = None, _key = None):
        enabled = settings.get('enabled') is True
        if not settings.get('selectedAccounts'):
            pass
        selected_accounts = []
        if not enabled and selected_accounts:
            await gateway.runtime.instances.list_attached()
            attached = tuple(<NODE:28>)
            account_ids = (lambda .0: [ str(item.account_id) for item in .0 if getattr(item, 'account_id', None) ])(attached)
            if len(account_ids) == 1:
                selected_accounts = account_ids
        account_id = str('').strip() if selected_accounts else ''
        history = { }
    # WARNING: Decompyle incomplete

    toggle_auto_comment = None(toggle_auto_comment)
    
    async def get_moment_interactions(_key = None):
        pass
    # WARNING: Decompyle incomplete

    get_moment_interactions = None(get_moment_interactions)
    if post_manager is not None:
        root = material_root.resolve()
        
        async def list_moment_plans(_key = None):
            root.mkdir(True, True, **('parents', 'exist_ok'))
            plans = sorted((lambda .0: 