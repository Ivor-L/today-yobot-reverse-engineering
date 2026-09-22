# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_add_friend.marshal (Python 3.9)

'''Legacy Vue automatic friend-add API over the process-owned macOS manager.'''
from __future__ import annotations
import asyncio
import csv
import hmac
from pathlib import Path
from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, File, HTTPException, Query, Security, UploadFile, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_add_friend_installed'
_MAX_IMPORT_BYTES = 20971520

class MacOSAddFriendSettings(BaseModel):
    enabled: 'bool' = ConfigDict('forbid', **('extra',))
    maxFriendsPerDay: 'Optional[int]' = Field(None, 1, 500, **('default', 'ge', 'le'))
    interval: 'Optional[int]' = Field(None, 1, 1440, **('default', 'ge', 'le'))
    batchSize: 'Optional[int]' = Field(None, 1, 100, **('default', 'ge', 'le'))
    verifyMessage: 'Optional[str]' = Field(None, 512, **('default', 'max_length'))
    multiCycleEnabled: 'Optional[bool]' = None
    accountIds: 'Optional[List[str]]' = None


class MacOSBatchDeleteFriendRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    wxids: 'List[str]' = Field(1, 20000, **('min_length', 'max_length'))


def create_macos_mvp_add_friend_router(*, manager, api_key):
    if manager is None:
        raise ValueError('manager is required')
    for method in ('toggle_add_friend_task', 'list_records', 'import_records', 'delete_records', 'remaining', 'get_logs', 'get_risk_records'):
        if not callable(getattr(manager, method, None)):
            raise TypeError('manager must expose {}()'.format(method))
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be non-empty text')
    header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented = None):
        if not presented:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, {
                'code': 'MACOS_MVP_API_KEY_INVALID',
                'message': 'invalid API key' }, **('status_code', 'detail'))
        return presented

    
    async def export_file(status_filter = None, tag = None):
        await manager.list_records(status_filter, tag)
        records = <NODE:28>
        export_root = manager.store.database_path.parent / 'exports'
        export_root.mkdir(True, True, **('parents', 'exist_ok'))
        path = export_root / 'friend_list_{}.csv'.format(uuid4().hex)
        if path.exists() or path.is_symlink():
            raise RuntimeError('friend-list export target is not new')
        
        def write():
            with path.open('w', '', 'utf-8-sig', **('newline', 'encoding')) as stream:
                writer = csv.writer(stream)
                writer.writerow([
                    '手机号',
                    '备注',
                    '标签',
                    '昵称',
                    '状态',
                    '分流账号',
                    '错误信息'])
                for item in records:
                    writer.writerow([
                        item.get('wxid', ''),
                        item.get('remark', ''),
                        item.get('tags', ''),
                        item.get('nickname', ''),
                        item.get('status', ''),
                        item.get('account_id', ''),
                        item.get('error', '')])
                None(None, None, None)
            with None:
                if not None:
                    pass

        await asyncio.to_thread(write)
        return path

    router = APIRouter()
    
    async def list_friends(status_filter = None, tag = None, _key = None):
        if not status_filter:
            pass
        if not tag:
            pass
        await manager.list_records('', '')
        return {
            'success': True,
            'data': list(<NODE:28>) }

    list_friends = None(list_friends)
    
    async def delete_friend(wxid = None, _key = None):
        await manager.delete_records([
            wxid])
        return {
            'success': <NODE:28> == 1 }

    delete_friend = None(delete_friend)
    
    async def batch_delete(request = None, _key = None):
        await manager.delete_records(request.wxids)
        deleted = <NODE:28>
        return {
            'success': True,
            'deleted': deleted }

    batch_delete = None(batch_delete)
    
    async def toggle(settings = None, _key = None):
        params = None
        if settings.enabled:
            if not getattr(settings, 'model_fields_set', None):
                pass
            fields_set = set(getattr(settings, '__fields_set__', set()))
            mapping = {
                'maxFriendsPerDay': ('maxFriendsPerDay', settings.maxFriendsPerDay),
                'batchSize': ('maxProcessPerTime', settings.batchSize),
                'interval': ('checkInterval', settings.interval),
                'verifyMessage': ('verifyMessage', settings.verifyMessage),
                'multiCycleEnabled': ('multiCycleEnabled', settings.multiCycleEnabled),
                'accountIds': ('accountIds', settings.accountIds) }
            params = (lambda .0 = None: pass# WARNING: Decompyle incomplete
)(mapping.items())
        await manager.toggle_add_friend_task(settings.enabled, params)
        result = <NODE:28>
        if not result.get('success'):
            return JSONResponse(400, {
                'success': False,
                'error': result.get('message', '操作失败') }, **('status_code', 'content'))
        return {
            'success': None,
            'data': {
                'task_id': result.get('task_id'),
                'status': 'pending' if settings.enabled else 'cancelled',
                'message': result.get('message', ''),
                'params': params } }

    toggle = None(toggle)
    
    async def import_friends(file = None, _key = None):
        if not file.filename:
            pass
        filename = str('')
        suffix = Path(filename).suffix.lower()
        if suffix not in ('.csv', '.xlsx', '.xls'):
            raise HTTPException(400, '仅支持 Excel 或 CSV 名单', **('status_code', 'detail'))
        await file.read(_MAX_IMPORT_BYTES + 1)
        content = <NODE:28>
        if not content:
            raise HTTPException(400, '名单文件为空', **('status_code', 'detail'))
        if len(content) > _MAX_IMPORT_BYTES:
            raise HTTPException(413, '名单文件超过20MB', **('status_code', 'detail'))
        upload_root = manager.store.database_path.parent / 'uploads'
        upload_root.mkdir(True, True, **('parents', 'exist_ok'))
        path = upload_root / 'import-{}{}'.format(uuid4().hex, suffix)
        if path.exists() or path.is_symlink():
            raise HTTPException(500, '导入临时文件冲突', **('status_code', 'detail'))
    # WARNING: Decompyle incomplete

    import_friends = None(import_friends)
    
    async def remaining(account_id = None, _key = None):
        await manager.remaining(account_id)
        return {
            'success': True,
            'data': dict(<NODE:28>) }

    remaining = None(remaining)
    
    async def logs(_key = None):
        await manager.get_logs()
        return {
            'success': True,
            'data': list(<NODE:28>) }

    logs = None(logs)
    
    async def risks(_key = None):
        await manager.get_risk_records()
        records = list(<NODE:28>)
        return {
            'success': True,
            'data': records,
            'records': records }

    risks = None(risks)
    
    async def export_friends(status_filter = None, tag = None, _key = None):
        if not status_filter:
            pass
        if not tag:
            pass
        await export_file('', '')
        path = <NODE:28>
        return FileResponse(str(path), path.name, 'text/csv', **('filename', 'media_type'))

    export_friends = None(export_friends)
    
    async def export_path(status_filter = None, tag = None, _key = None):
        if not status_filter:
            pass
        if not tag:
            pass
        await export_file('', '')
        path = <NODE:28>
        return {
            'success': True,
            'path': str(path) }

    export_path = None(export_path)
    return router


def install_macos_mvp_add_friend_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS automatic friend-add routes are already installed')
    inputs = runtime.preparation.launch_plan.inputs
    states = runtime.product_owner.capability_catalog.snapshot_capabilities()
    if not set(states) != set(MACOS_MVP_CAPABILITY_NAMES) or all((lambda .0: for item in .0:
item.available)(states.values())):
        raise RuntimeError('macOS automatic friend-add routes require the complete capability catalog')
    manager = runtime.dependencies.add_friend_manager
    if manager is None:
        raise RuntimeError('the macOS process has no automatic friend-add manager')
    frontend = tuple((lambda .0: 