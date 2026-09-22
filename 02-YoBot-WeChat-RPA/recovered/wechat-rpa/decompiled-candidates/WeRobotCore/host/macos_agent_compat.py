# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_agent_compat.marshal (Python 3.9)

'''Agent-facing compatibility routes over the process-owned macOS runtime.

These endpoints preserve the established Windows Agent contract without
importing Windows UIAutomation or process-global manager singletons.
'''
from __future__ import annotations
from datetime import datetime, timedelta
import hmac
from pathlib import Path
import time
from typing import Any, Dict, List, Mapping, Optional
from fastapi import APIRouter, HTTPException, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict, Field
from WeRobotCore.application.runtime import WeChatAutomationGateway
from macos_mvp_chat import _account_context, _find_session
from macos_process import MacOSControlProcessRuntime
_INSTALLATION_STATE_KEY = 'yokowebot_macos_agent_compat_installed'

class MacOSAgentSendFileRequest(BaseModel):
    model_config = ConfigDict(True, 'forbid', **('populate_by_name', 'extra'))
    user: 'str' = Field(1, 256, **('min_length', 'max_length'))
    file_path: 'str' = Field('filePath', 1, **('alias', 'min_length'))
    account_id: 'Optional[str]' = Field(None, 'accountId', **('alias',))


class MacOSAgentMassSendingRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    tags: 'Optional[List[str]]' = None
    targets: 'Optional[List[str]]' = None
    greeting_group: 'Optional[str]' = None
    text: 'Optional[str]' = None
    schedule_time: 'Optional[str]' = None
    batch_size: 'int' = Field(10, 2, 500, **('default', 'ge', 'le'))
    account_id: 'Optional[str]' = None
    send_interval: 'Optional[str]' = None


class MacOSAgentTestRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    agent_id: 'str' = Field(1, 256, **('min_length', 'max_length'))
    platform: 'str' = Field(1, 32, **('min_length', 'max_length'))


def _format_task(task = None, scheduler = None):
    if not task.get('id'):
        pass
    task_id = str('')
    if not task.get('type'):
        pass
    task_type = str('unknown')
    task_params = task.get('params', { })
    task_params = task_params if isinstance(task_params, Mapping) else { }
    metadata = { }
    schedule_metadata = getattr(scheduler, '_schedule_metadata', { })
    if isinstance(schedule_metadata, Mapping):
        candidate = schedule_metadata.get(task_id)
        if isinstance(candidate, Mapping):
            metadata = candidate
    if metadata and isinstance(task_params.get('metadata'), Mapping):
        metadata = task_params['metadata']
    task_info = metadata.get('task_info', { })
    if not isinstance(task_info, Mapping):
        task_info = { }
    inner = task_params.get('task_params', task_params)
    inner = inner if isinstance(inner, Mapping) else { }
    core_params = { }
    if task_type == 'auto_follow':
        friend = metadata.get('friend_info', { })
        friend = friend if isinstance(friend, Mapping) else { }
        strategy = metadata.get('execution_strategy', { })
        strategy = strategy if isinstance(strategy, Mapping) else { }
        config = metadata.get('task_config', { })
        config = config if isinstance(config, Mapping) else { }
        statistics = metadata.get('execution_stats', { })
        statistics = statistics if isinstance(statistics, Mapping) else { }
        core_params = {
            'friend_wxid': friend.get('wxid'),
            'friend_name': friend.get('name'),
            'account_id': friend.get('account_id'),
            'follow_scenario': strategy.get('follow_scenario'),
            'start_date': strategy.get('start_date'),
            'end_date': strategy.get('end_date'),
            'time_range': '{} - {}'.format(strategy.get('time_range_start'), strategy.get('time_range_end')),
            'agent_id': config.get('agent_id'),
            'execution_count': statistics.get('execution_count') }
    elif task_type == 'sync_contacts':
        config = metadata.get('sync_config', { })
        config = config if isinstance(config, Mapping) else { }
        statistics = metadata.get('execution_stats', { })
        statistics = statistics if isinstance(statistics, Mapping) else { }
        core_params = {
            'sync_items': config.get('sync_items'),
            'sync_frequency': config.get('sync_frequency'),
            'time_range': '{} - {}'.format(config.get('time_range_start'), config.get('time_range_end')),
            'execution_count': statistics.get('execution_count') }
    elif task_type == 'auto_reply':
        task_data = task_params.get('task_data', { })
        task_data = task_data if isinstance(task_data, Mapping) else { }
        params_data = task_data.get('params', { })
        params_data = params_data if isinstance(params_data, Mapping) else { }
        core_params = {
            'session_id': params_data.get('session_id'),
            'session_name': params_data.get('session_name'),
            'account_id': task_data.get('account_id'),
            'is_group': params_data.get('is_group'),
            'message_num': task_data.get('message_num') }
    elif task_type == 'mass_sending':
        if not inner.get('selectedFriends', []):
            pass
        core_params = {
            'greetingGroupId': inner.get('greetingGroupId'),
            'agentId': inner.get('agentId'),
            'timeType': inner.get('timeType'),
            'selectedFriends_count': len([]),
            'tagIds': inner.get('tagIds'),
            'account_id': inner.get('account_id') }
    elif task_type == 'moment_comment':
        core_params = {
            'account_id': inner.get('accountId'),
            'selectedAccounts': inner.get('selectedAccounts'),
            'agentId': inner.get('agentId'),
            'interactionMode': inner.get('interactionMode') }
    elif task_type in ('add_friend', 'friend_request'):
        core_params = dict(inner)
    if not task.get('next_run_time'):
        pass
    next_run = task.get('execution_time')
    if isinstance(next_run, datetime):
        next_run = next_run.isoformat()
    if not task.get('status'):
        pass
    return {
        'task_id': task_id,
        'task_type': task_type,
        'status': str('unknown'),
        'next_run_time': next_run,
        'created_at': task_info.get('created_at'),
        'updated_at': task_info.get('updated_at'),
        'core_params': core_params,
        'raw_params': dict(task_params),
        'metadata': dict(metadata) }


async def _manager_status(manager = None):
    if manager is None:
        return { }
    for name in None:
        method = getattr(manager, name, None)
        if not callable(method):
            continue
        result = method()
        if hasattr(result, '__await__'):
            await result
            result = <NODE:28>
        return result if isinstance(result, Mapping) else { }
        return { }


def create_macos_agent_compat_router(*, gateway, api_key, scheduler, permission_manager, mass_sending_manager, moment_comment_manager, friend_request_manager, add_friend_manager, multi_chat_monitor, configuration, private_agent_probe):
    if not isinstance(gateway, WeChatAutomationGateway):
        raise TypeError('gateway must be WeChatAutomationGateway')
    if not isinstance(api_key, str) or api_key.strip():
        raise ValueError('api_key must be non-empty text')
    if not callable(getattr(scheduler, 'get_all_tasks', None)):
        raise TypeError('scheduler must expose get_all_tasks()')
    if not callable(getattr(permission_manager, 'get_statistics', None)):
        raise TypeError('permission_manager must expose get_statistics()')
    if not callable(getattr(mass_sending_manager, 'create_mass_sending_task', None)):
        raise TypeError('mass_sending_manager must expose create_mass_sending_task()')
    if not callable(getattr(configuration, 'get_agent_by_id', None)):
        raise TypeError('configuration must expose get_agent_by_id()')
    if not callable(private_agent_probe):
        raise TypeError('private_agent_probe must be callable')
    header = APIKeyHeader('X-API-Key', False, **('name', 'auto_error'))
    
    async def authenticate(presented = None):
        if not presented:
            pass
        if not hmac.compare_digest('', api_key):
            raise HTTPException(status.HTTP_403_FORBIDDEN, {
                'code': 'MACOS_AGENT_API_KEY_INVALID',
                'message': 'invalid API key' }, **('status_code', 'detail'))
        return presented

    router = APIRouter()
    session_index = { }
    
    async def send_file(request = None, _key = None):
        path = Path(request.file_path).expanduser()
        if not path.is_absolute() or path.is_file():
            return JSONResponse(400, {
                'success': False,
                'error': '发送文件必须是存在的绝对路径' }, **('status_code', 'content'))
        await _account_context(gateway, request.account_id)
        context = <NODE:28>
        await _find_session(context, request.user, session_index)
        summary = <NODE:28>
        await context.send_file(summary.session_id, str(path))
        outcome = <NODE:28>
        if outcome.success:
            pass
        payload = {
            'success': bool(outcome.verified),
            'verified': bool(outcome.verified),
            'code': outcome.code.value,
            'message': outcome.message,
            'data': dict(outcome.data) }
        if payload['success']:
            pass
        return None
        :
            path = Path(request.file_path).expanduser()
            if not path.is_absolute() or path.is_file():
                return JSONResponse(400, {
                    'success': False,
                    'error': '发送文件必须是存在的绝对路径' }, **('status_code', 'content'))
            await _account_context(gateway, request.account_id)
            context = <NODE:28>
            await _find_session(context, request.user, session_index)
            summary = <NODE:28>
            await context.send_file(summary.session_id, str(path))
            outcome = <NODE:28>
            if outcome.success:
                pass
            payload = {
                'success': bool(outcome.verified),
                'verified': bool(outcome.verified),
                'code': outcome.code.value,
                'message': outcome.message,
                'data': dict(outcome.data) }
            if payload['success']:
                pass
            return None
            
            return JSONResponse(500, {
                'success': False,
                'error': outcome.message,
                'data': payload }, **('status_code', 'content'))
        return JSONResponse(500, {
            'success': False,
            'error': outcome.message,
            'data': payload }, **('status_code', 'content'))
    # WARNING: Decompyle incomplete

    send_file = None(send_file)
    
    async def mass_sending(request = None, _key = None):
        if not request.tags:
            pass
        tags = []
        if not request.targets:
            pass
        targets = []
        if not tags and targets:
            return {
                'success': False,
                'error': '请提供好友标签或目标名称列表' }
        if not request.text:
            pass
        direct_text = None('').strip()
        if not request.greeting_group:
            pass
        greeting_group = str('').strip()
        if bool(direct_text) == bool(greeting_group):
            return {
                'success': False,
                'error': '话术组与直接文本文案必须二选一' }
        schedule_time = None
    # WARNING: Decompyle incomplete

    mass_sending = None(mass_sending)
    
    async def tasks(_key = None):
        await scheduler.get_all_tasks()
        values = <NODE:28>
        formatted = (lambda .0 = None: [ _format_task(item, scheduler) for item in .0 ])(values)
        return {
            'success': True,
            'message': '获取任务列表成功',
            'data': {
                'total': len(formatted),
                'tasks': formatted } }

    tasks = None(tasks)
    
    async def backend_status(_key = None):
        await gateway.runtime.instances.list_attached()
        attached = tuple(<NODE:28>)
        await gateway.runtime.instances.discover()
        discovered = tuple(<NODE:28>)
        scheduler_status = scheduler.get_status()
        scheduler_state = getattr(scheduler_status, 'state', scheduler_status)
        scheduler_state = getattr(scheduler_state, 'value', scheduler_state)
        runtime_status = {
            'permission': permission_manager.get_statistics(),
            'scheduler': {
                'state': str(scheduler_state),
                'startup_guard_active': bool(getattr(scheduler, '_startup_guard_active', False)),
                'reconciliation_completed': bool(getattr(scheduler, '_reconciliation_completed', False)),
                'singleton_inflight_task_ids': sorted(getattr(scheduler, '_singleton_inflight_task_ids', set())) },
            'restart_requires_user_confirmation': True }
        await _manager_status(moment_comment_manager)
        await _manager_status(add_friend_manager)
        await _manager_status(friend_request_manager)
        feature_status = {
            'auto_reply': bool(getattr(multi_chat_monitor, 'is_running', (lambda : False))()),
            'moment_comment': bool(<NODE:28>.get('task_enabled', False)),
            'add_friend': bool(<NODE:28>.get('task_enabled', False)),
            'friend_request': bool(<NODE:28>.get('task_enabled', False)) }
        await scheduler.get_all_tasks()
        task_values = list(<NODE:28>)
        if not attached:
            detected = bool(discovered)
            code = 'WECHAT_NOT_INITIALIZED' if detected else 'WECHAT_NOT_RUNNING'
            detected_hint = '检测到微信进程但尚未初始化，请调用 wechat_initialize 绑定已登录的微信实例'
            absent_hint = '未检测到微信进程，请用户先启动并登录微信，再调用 wechat_initialize'
            hint = detected_hint if detected else absent_hint
            return {
                'success': False,
                'code': code,
                'message': hint,
                'tasks': task_values,
                'features': feature_status,
                'runtime': runtime_status,
                'payload': {
                    'current_state': 'wechat_detected_not_initialized' if detected else 'no_wechat',
                    'instances_total': len(discovered),
                    'instances_initialized': 0,
                    'restart_recommended': False,
                    'next_action': {
                        'action': 'init_instances',
                        'tool': 'wechat_initialize',
                        'endpoint': 'POST /api/init/multi',
                        'hint': hint } } }
        return {
            'success': None,
            'timestamp': int(time.time()),
            'is_backend_mode': True,
            'standby_mode': False,
            'reply_mode': str(getattr(multi_chat_monitor, '_reply_mode', 'local')),
            'tasks': task_values,
            'features': feature_status,
            'runtime': runtime_status,
            'payload': {
                'current_state': 'ready' if attached else 'no_wechat',
                'instances_total': len(attached),
                'instances_initialized': len(attached),
                'next_action': None if attached else {
                    'action': 'init_instances',
                    'tool': 'wechat_initialize',
                    'endpoint': 'POST /api/init/multi',
                    'hint': '请先启动并登录微信，再初始化微信实例' } } }

    backend_status = None(backend_status)
    
    async def features_status(_key = None):
        await _manager_status(moment_comment_manager)
        moment = <NODE:28>
        await _manager_status(friend_request_manager)
        friend_request = <NODE:28>
        await _manager_status(add_friend_manager)
        add_friend = <NODE:28>
        await _manager_status(multi_chat_monitor)
        monitor = <NODE:28>
        values = [
            {
                'feature': 'moment_comment',
                'enabled': bool(moment.get('task_enabled', False)),
                'params': {
                    'total_tasks': moment.get('total_tasks', 0) } },
            {
                'feature': 'friend_request',
                'enabled': bool(friend_request.get('task_enabled', False)),
                'params': {
                    'active_tasks': friend_request.get('active_tasks', 0) } },
            {
                'feature': 'add_friend',
                'enabled': bool(add_friend.get('task_enabled', False)),
                'params': {
                    'active_tasks_count': add_friend.get('active_tasks_count', 0) } },
            {
                'feature': 'multi_chat_monitor',
                'enabled': bool(monitor.get('running', False)),
                'params': {
                    'total_monitors': monitor.get('total_monitors', 0) } }]
        return {
            'success': True,
            'message': '获取功能状态成功',
            'data': values }

    features_status = None(features_status)
    
    async def test_agent(request = None, _key = None):
        agent = configuration.get_agent_by_id(request.agent_id)
        if not agent:
            return {
                'success': False,
                'error': '未找到智能体信息: {}'.format(request.agent_id) }
        platform = None.platform.lower()
        if platform == 'agentic':
            if not agent.get('apiUrl'):
                pass
            if not agent.get('apiToken'):
                pass
            await private_agent_probe(str(''), None)
            probe = <NODE:28>
            if not probe.get('success'):
                if not probe.get('error'):
                    pass
                return {
                    'success': False,
                    'error': '接口连接失败' }
            if not None.get('capabilities'):
                pass
            capabilities = { }
            if not capabilities.get('profiles'):
                pass
            profiles = []
            if not profiles and None((lambda .0 = None: for item in .0:
item.get('id') == request.agent_id)(profiles)):
                return {
                    'success': False,
                    'error': '接口未提供智能体 ID：{}'.format(request.agent_id) }
            if not None.get('scenes'):
                pass
            scenes = []
            if scenes and 'auto_reply' not in scenes:
                return {
                    'success': False,
                    'error': '接口不支持 auto_reply 场景' }
            if not agent.get('deliveryMode'):
                pass
            if None('sync_reply') == 'async_reply':
                async_capability = capabilities.get('asyncReply')
                if isinstance(async_capability, Mapping) or async_capability.get('statusPathTemplate') != '/v1/jobs/{jobId}':
                    return {
                        'success': False,
                        'error': '接口未声明受支持的异步任务查询路径 /v1/jobs/{jobId}' }
                return {
                    'success': None,
                    'message': '私域Agent接口连接正常' }
            if None not in ('coze', 'coze3', 'dify', 'fireflow'):
                return {
                    'success': False,
                    'error': '不支持的服务类型: {}'.format(platform) }
        config = { } if None in ('coze3', 'fireflow') else configuration.load_config(platform + '_settings')
    # WARNING: Decompyle incomplete

    test_agent = None(test_agent)
    return router


def install_macos_agent_compat_routes(runtime = None):
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    app = runtime.app
    if getattr(app.state, _INSTALLATION_STATE_KEY, False):
        raise RuntimeError('the macOS Agent compatibility routes are already installed')
    publication = runtime.product_owner.publication
    if publication is None:
        raise RuntimeError('the macOS product is not published')
    configuration_factory = runtime.product_owner.configuration_factory
    if configuration_factory is None:
        raise RuntimeError('the macOS configuration factory is unavailable')
    inputs = runtime.preparation.launch_plan.inputs
    dependencies = runtime.dependencies
    router = create_macos_agent_compat_router(WeChatAutomationGateway(publication.product_runtime.runtime), inputs.credentials.local_api_key, dependencies.scheduler, dependencies.permission_manager, dependencies.mass_sending_manager, dependencies.moment_comment_manager, dependencies.friend_request_manager, dependencies.add_friend_manager, dependencies.multi_chat_monitor, configuration_factory.global_configuration(), dependencies.private_agent_probe, **('gateway', 'api_key', 'scheduler', 'permission_manager', 'mass_sending_manager', 'moment_comment_manager', 'friend_request_manager', 'add_friend_manager', 'multi_chat_monitor', 'configuration', 'private_agent_probe'))
    frontend_routes = tuple((lambda .0: 