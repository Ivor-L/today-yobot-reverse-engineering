# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: multi_chat_monitor.marshal (Python 3.9)

import asyncio
from typing import Dict, List, Mapping, Optional, Sequence
from datetime import datetime
from chat_monitor import ChatMonitorV2
from application.monitoring import LegacyMonitorTelemetrySink, MonitorAccount, MonitorRuntimeSource, MonitorSessionSource, MonitorTelemetrySink, require_monitor_telemetry
from application.auto_reply import AutoReplyRuntimeConfigurationFactory
from core.uia_logger import UiaLogger
from websocket_manager import websocket_manager

class MultiChatMonitor:
    '''多微信实例聊天监控器'''
    _instance = None
    
    def __new__(cls = None):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    
    def __init__(self):
        if not self._initialized:
            self.instance_monitors = { }
            self.instance_manager = None
            self.logger = UiaLogger('MultiChatMonitor', **('logger_name',)).get_logger()
            self._running = False
            self._monitor_task = None
            self._check_interval = 10
            self._manual_review_enabled = False
            self._user_paused = False
            self._reply_mode = 'local'
            self._session_source = None
            self._runtime_source = None
            self._configuration_factory = None
            self._telemetry = LegacyMonitorTelemetrySink()
            self._initialized = True

    
    def bind_session_source(self = None, source = None):
        '''Bind one shared Driver source before multi-account monitoring.'''
        if self._running:
            raise RuntimeError('session source cannot be rebound while multi-monitor is running')
        if not source is None or isinstance(source, MonitorSessionSource):
            raise TypeError('source must implement MonitorSessionSource')
        self._session_source = source

    
    def bind_runtime_source(self = None, source = None):
        '''Bind Driver account/runtime facts before monitoring starts.'''
        if self._running:
            raise RuntimeError('runtime source cannot be rebound while multi-monitor is running')
        if not source is None or isinstance(source, MonitorRuntimeSource):
            raise TypeError('source must implement MonitorRuntimeSource')
        self._runtime_source = source

    
    def bind_configuration_factory(self = None, factory = None):
        '''Bind runtime configuration before any account monitor exists.'''
        if self._running:
            raise RuntimeError('configuration factory cannot be rebound while multi-monitor is running')
        if self.instance_monitors:
            raise RuntimeError('configuration factory cannot be rebound after monitors exist')
        if not factory is None or isinstance(factory, AutoReplyRuntimeConfigurationFactory):
            raise TypeError('factory must implement AutoReplyRuntimeConfigurationFactory')
        self._configuration_factory = factory

    
    def bind_telemetry(self = None, telemetry = None):
        '''Bind one platform-owned monitor telemetry sink before startup.'''
        if self._running:
            raise RuntimeError('telemetry cannot be rebound while multi-monitor is running')
        if self.instance_monitors:
            raise RuntimeError('telemetry cannot be rebound after monitors exist')
        self._telemetry = require_monitor_telemetry(telemetry)

    
    async def _get_valid_instances(self = None):
        '''Return the existing internal shape from either runtime source.'''
        source = getattr(self, '_runtime_source', None)
        if source is None:
            return self._get_legacy_instance_manager().get_all_valid_instances()
        await None.list_ready_accounts()
        accounts = <NODE:28>
        if not isinstance(accounts, (str, bytes)) or isinstance(accounts, Sequence):
            raise TypeError('runtime source must return a sequence of accounts')
        instances = []
        for account in accounts:
            if not isinstance(account, MonitorAccount):
                raise TypeError('runtime source must return MonitorAccount values')
            instances.append({
                'instance_id': account.instance_id,
                'account_info': {
                    'account_id': account.account_id,
                    'nickname': account.nickname },
                'initialized': True,
                'hot_attached': True })
        return tuple(instances)

    
    async def _cleanup_invalid_instances(self = None):
        source = getattr(self, '_runtime_source', None)
        if source is None:
            await self._get_legacy_instance_manager().cleanup_invalid_instances()
            return None
        await None.cleanup_invalid_accounts()

    
    def _get_legacy_instance_manager(self):
        manager = getattr(self, 'instance_manager', None)
        if manager is None:
            InstanceManagerV3 = InstanceManagerV3
            import core.instance_manager_v3
            manager = InstanceManagerV3()
            self.instance_manager = manager
        return manager

    
    async def _get_account_info(self = None, account_id = None):
        await self._get_valid_instances()
        for instance in <NODE:28>:
            if not instance.get('account_info'):
                pass
            account_info = { }
            if account_info.get('account_id') == account_id:
                return account_info
            return None

    
    async def start_monitoring_all(self = None, initiated = None, reply_mode = None):
        '''启动所有实例的监控

        Args:
            initiated: 是否为初始化启动，True表示用户手动启动，False表示调度器恢复启动
            reply_mode: 回复处理模式，"local" 本地LLM，"agent" 推送给Agent
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def stop_monitoring_all(self = None, user_initiated = None):
        '''停止所有实例的监控
        
        Args:
            user_initiated: 是否为用户主动停止，True表示用户手动停止，False表示被调度器暂停
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def start_instance_monitor(self = None, instance_info = None, initiated = None):
        '''启动单个实例的监控
        
        Args:
            instance_info: 实例信息
            initiated: 是否为初始化启动，True表示用户手动启动，False表示调度器恢复启动
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def stop_instance_monitor(self = None, account_id = None, user_initiated = None):
        '''停止单个实例的监控
        
        Args:
            account_id: 账号ID
            user_initiated: 是否为用户主动停止，True表示用户手动停止，False表示被调度器暂停
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def _monitor_instances(self):
        '''监控实例状态'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _check_instance_status(self):
        '''检查实例状态'''
        pass
    # WARNING: Decompyle incomplete

    
    def get_monitor_status(self = None):
        '''获取监控状态'''
        pass
    # WARNING: Decompyle incomplete

    
    def is_running(self = None):
        '''检查是否正在运行'''
        if self._running and self._monitor_task and not self._monitor_task.done() and not self._monitor_task.cancelled() and self.instance_monitors:
            pass
        return bool(all((lambda .0: for monitor in .0:
monitor.is_running())(self.instance_monitors.values())))

    
    def get_active_monitors_count(self = None):
        '''获取活跃监控器数量'''
        pass
    # WARNING: Decompyle incomplete

    
    def set_manual_review_enabled(self = None, enabled = None):
        '''设置全局人工复核状态'''
        self._manual_review_enabled = enabled
        for monitor in self.instance_monitors.values():
            monitor.set_manual_review_enabled(enabled)
        self.logger.info(f'''人工复核状态已更新: {enabled}''')

    
    def get_manual_review_enabled(self = None):
        '''获取全局人工复核状态'''
        return self._manual_review_enabled

    
    def sync_manual_review_to_monitor(self, monitor):
        '''同步全局人工复核状态到指定监控器'''
        monitor.set_manual_review_enabled(self._manual_review_enabled)

    
    def set_user_paused(self = None, paused = None):
        '''设置用户主动暂停状态'''
        self._user_paused = paused
        for monitor in self.instance_monitors.values():
            monitor._user_paused = paused
        self.logger.info(f'''用户暂停状态已更新: {paused}''')

    
    def get_pause_status(self = None):
        '''获取暂停状态'''
        return {
            'user_paused': self._user_paused }

    
    async def pause_monitoring_by_user(self):
        '''用户主动暂停监控'''
        pass
    # WARNING: Decompyle incomplete

    
    async def resume_monitoring_by_user(self):
        '''用户主动恢复监控'''
        pass
    # WARNING: Decompyle incomplete

    
    async def broadcast_session_update(self = None, account_id = None, session_data = None):
        '''广播会话更新，携带账号信息'''
        pass
    # WARNING: Decompyle incomplete

    
    async def broadcast_pending_reply_with_account(self, account_id, task_id = None, session_name = None, ai_reply = None, user_question = (25,), timeout = {
        'account_id': str,
        'task_id': str,
        'session_name': str,
        'ai_reply': str,
        'user_question': str,
        'timeout': int }):
        '''广播待确认回复，携带账号信息'''
        pass
    # WARNING: Decompyle incomplete

    __classcell__ = None

multi_chat_monitor = MultiChatMonitor()
