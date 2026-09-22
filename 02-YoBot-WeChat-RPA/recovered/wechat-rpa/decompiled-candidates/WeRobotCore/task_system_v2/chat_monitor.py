# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: chat_monitor.marshal (Python 3.9)

from typing import Any, Mapping
from datetime import datetime, timedelta
import asyncio
import inspect
import re
import time
import traceback
from utils.config_manager import ConfigManager
from utils.window_occlusion import WindowOcclusionResult, WindowOcclusionState, calculate_window_occlusion
from application.monitoring import CHAT_TYPE_UNKNOWN, MonitorAccountStatus, MonitorPollVisibility, MonitorPollVisibilityState, MonitorRuntimeSource, SESSION_PREVIEW_SELF, MonitorSessionBatch, MonitorSessionSource, LegacyMonitorTelemetrySink, MonitorTelemetrySink, monitor_task_skip_reason, require_monitor_telemetry
from application.auto_reply import AutoReplyRuntimeConfigurationFactory, require_runtime_configuration
from domain import ChatType
from command_manager import CommandManager
from websocket_manager import websocket_manager
from core.uia_logger import UiaLogger
from task_system_v3.unified_manager_pattern import get_auto_reply_manager
EXITED_GROUP_CHAT_MESSAGES = {
    '你已退出该群聊。',
    '你已解散该群聊'}
SESSION_LIST_MIN_VISIBLE_RATIO = 0.03
OCCLUSION_UNKNOWN_LOG_COOLDOWN_SECONDS = 300

class ChatMonitorV2:
    _instances = { }
    _default_instance = None
    
    def __new__(cls = None, account_id = None, configuration_factory = None, telemetry = None):
        if account_id is None:
            if cls._default_instance is None:
                cls._default_instance = super().__new__(cls)
                cls._default_instance._initialized = False
                cls._default_instance.account_id = None
            return cls._default_instance
        if None not in cls._instances:
            instance = super().__new__(cls)
            instance._initialized = False
            instance.account_id = account_id
            cls._instances[account_id] = instance
        return cls._instances[account_id]

    
    def __init__(self = None, account_id = None, configuration_factory = None, telemetry = (None, None, None)):
        if hasattr(self, '_initialized') and self._initialized:
            if configuration_factory is not None and getattr(self, '_configuration_factory', None) is not configuration_factory:
                self.bind_configuration_factory(configuration_factory)
            if telemetry is not None and getattr(self, '_telemetry', None) is not telemetry:
                self.bind_telemetry(telemetry)
            return None
        self._initialized = None
        self.account_id = account_id
        self._running = False
        self._monitor_task = None
        self._configuration_factory = configuration_factory
        self._telemetry = require_monitor_telemetry(LegacyMonitorTelemetrySink() if telemetry is None else telemetry)
        if configuration_factory is None:
            self.config_manager = ConfigManager(account_id)
        elif not isinstance(configuration_factory, AutoReplyRuntimeConfigurationFactory):
            raise TypeError('configuration_factory must implement AutoReplyRuntimeConfigurationFactory')
        self.config_manager = require_runtime_configuration(configuration_factory.for_account(account_id))
        self.logger = UiaLogger('ChatMonitorV2', **('logger_name',)).get_logger()
        self._check_interval = 5
        self._monitor_start_time = None
        self._last_message_cache = { }
        self._message_cache = { }
        self._session_cache = []
        self._session_item_cache = []
        self._last_message_times = { }
        self._lock = asyncio.Lock()
        self._user_paused = False
        self._offline_count = 0
        self._last_account_runtime_status = {
            'status': 'unknown',
            'reason_code': 'WECHAT_STATUS_UNKNOWN',
            'message': '尚未检测微信状态' }
        self._session_list_occluded_since = None
        self._session_list_occluded_skips = 0
        self._last_occlusion_unknown_warning_at = None
        self._pending_initial_baseline = False
        self._initial_baseline_deferred_by_occlusion = False
        self._cycle_diagnostics = { }
        self._reply_mode = 'local'
        self.command_manager = CommandManager()
        self._manual_review_enabled = False
        self._session_source = None
        self._runtime_source = None
        self.auto_reply_manager_v3 = None

    
    def bind_session_source(self = None, source = None):
        '''Bind one platform session source before this monitor starts.

        Rebinding a live monitor could mix two driver snapshots in the same
        comparison cache, so the operation is intentionally rejected while
        running.  Default Windows construction remains unchanged.
        '''
        if self._running:
            raise RuntimeError('session source cannot be rebound while monitoring')
        if not source is None or isinstance(source, MonitorSessionSource):
            raise TypeError('source must implement MonitorSessionSource')
        self._session_source = source

    
    def bind_runtime_source(self = None, source = None):
        '''Bind platform runtime facts before the monitor starts.'''
        if self._running:
            raise RuntimeError('runtime source cannot be rebound while monitoring')
        if not source is None or isinstance(source, MonitorRuntimeSource):
            raise TypeError('source must implement MonitorRuntimeSource')
        self._runtime_source = source

    
    def bind_configuration_factory(self = None, factory = None):
        '''Bind explicit configuration before the first monitor cycle.'''
        if self._running:
            raise RuntimeError('configuration factory cannot be rebound while monitoring')
        if not factory is None or isinstance(factory, AutoReplyRuntimeConfigurationFactory):
            raise TypeError('factory must implement AutoReplyRuntimeConfigurationFactory')
        self._configuration_factory = factory
        self.config_manager = require_runtime_configuration(factory.for_account(self.account_id))

    
    def bind_telemetry(self = None, telemetry = None):
        '''Bind platform-owned telemetry before the monitor starts.'''
        if self._running:
            raise RuntimeError('telemetry cannot be rebound while monitoring')
        self._telemetry = require_monitor_telemetry(telemetry)

    
    def _get_session_source(self = None):
        source = getattr(self, '_session_source', None)
        if source is None:
            WindowsLegacyMonitorSessionSource = WindowsLegacyMonitorSessionSource
            import adapters.wechat.windows_legacy
            chat = chat
            import api
            source = WindowsLegacyMonitorSessionSource(chat)
            self._session_source = source
        return source

    
    async def start(self, initiated = (True,)):
        '''
        启动会话监控
         Args:
            initiated: 是否由用户主动启动，如果是其他调度器触发的重启，则无需重置_monitor_start_time字段，这样可以执行最新3分钟接收到的新消息。
        '''
        if self._running:
            return None
        self._telemetry.record_diagnostic_event('MONITOR_START_REQUESTED', self.account_id, bool(initiated), self._reply_mode, **('account_id', 'initiated', 'reply_mode'))
    # WARNING: Decompyle incomplete

    
    def set_manual_review_enabled(self = None, enabled = None):
        '''设置人工复核状态'''
        self._manual_review_enabled = enabled

    
    def get_manual_review_enabled(self = None):
        '''获取人工复核状态'''
        return self._manual_review_enabled

    
    async def _monitor_loop(self):
        '''监控循环'''
        print(f'''开始监控循环 , 检查间隔: {self._check_interval}秒''')
    # WARNING: Decompyle incomplete

    
    async def stop(self, user_initiated = (False,)):
        '''停止会话监控'''
        pass
    # WARNING: Decompyle incomplete

    
    def is_running(self = None):
        '''获取监控器运行状态'''
        task = self._monitor_task
        if self._running and task and not task.done():
            pass
        return bool(not task.cancelled())

    
    def _cleanup_resources(self):
        '''清理资源'''
        pass
    # WARNING: Decompyle incomplete

    
    def _normalize_session_preview(self = None, content = None):
        '''规范化会话列表预览文本，避免未读前缀导致误判。'''
        if not content:
            pass
        preview = ''
        preview = re.sub('^\\[\\d+条\\]\\s*', '', preview)
        preview = re.sub('^\\[(?:有人)?@[^\\]]+\\]\\s*', '', preview)
        return preview.strip()

    
    def _is_exited_group_chat_notice(self = None, content = None):
        '''识别已退出群聊的系统提示；该会话已不可回复，直接跳过自动回复。'''
        return self._normalize_session_preview(content) in EXITED_GROUP_CHAT_MESSAGES

    
    async def _is_account_online(self = None):
        '''检测当前监听账号的微信是否在线（掉线判断）。复用通用检测模块。'''
        source = getattr(self, '_runtime_source', None)
        if source is not None:
            await source.get_account_status(self.account_id)
            status = <NODE:28>
            if not isinstance(status, MonitorAccountStatus):
                raise TypeError('runtime source must return MonitorAccountStatus')
            self._last_account_runtime_status = {
                'status': status.state.value,
                'reason_code': status.reason_code,
                'message': status.message }
            return status.readable
        account_online_monitor = account_online_monitor
        import core
        self._last_account_runtime_status = account_online_monitor.get_account_status(self.account_id)
        return self._last_account_runtime_status.get('status') in frozenset({'online', 'unknown'})

    
    def _get_account_window_handle(self = None):
        '''只从实例映射读取窗口句柄，不触发 UIA。'''
        pass
    # WARNING: Decompyle incomplete

    
    async def _get_session_list_occlusion(self):
        '''计算微信窗口遮挡状态；检测异常由工具层统一降级为 UNKNOWN。'''
        source = getattr(self, '_runtime_source', None)
        if source is not None:
            await source.get_poll_visibility(self.account_id)
            result = <NODE:28>
            if not isinstance(result, MonitorPollVisibility):
                raise TypeError('runtime source must return MonitorPollVisibility')
            return result
        return None(self._get_account_window_handle(), SESSION_LIST_MIN_VISIBLE_RATIO, **('min_visible_ratio',))

    
    def _format_visible_ratio(result = None):
        if result.visible_ratio is None:
            return 'unknown'
        return f'''{None.visible_ratio:.4f}'''

    _format_visible_ratio = None(_format_visible_ratio)
    
    async def _should_skip_session_list_poll(self = None):
        '''仅在明确完全遮挡时跳过高频会话列表 UIA 读取。'''
        result = self._get_session_list_occlusion()
        if inspect.isawaitable(result):
            await result
            result = <NODE:28>
        now = time.monotonic()
        if result.state == MonitorPollVisibilityState.NOT_APPLICABLE:
            self._session_list_occluded_since = None
            self._session_list_occluded_skips = 0
            self._last_occlusion_unknown_warning_at = None
            return False
        if None.state in {
            WindowOcclusionState.FULLY_OCCLUDED,
            MonitorPollVisibilityState.FULLY_OCCLUDED}:
            if self._session_list_occluded_since is None:
                self._session_list_occluded_since = now
                self._session_list_occluded_skips = 0
                self.logger.warning(f'''微信窗口完全遮挡，跳过会话列表读取: account_id={self.account_id}, visible_ratio={self._format_visible_ratio(result)}, threshold={SESSION_LIST_MIN_VISIBLE_RATIO:.4f}, reason={result.reason}, occluders={result.occluding_window_count}, cost={result.elapsed_ms:.3f}ms''')
            self._session_list_occluded_skips += 1
            if self._pending_initial_baseline:
                self._initial_baseline_deferred_by_occlusion = True
            return True
        if None._session_list_occluded_since is not None:
            duration = max(0, now - self._session_list_occluded_since)
            message = f'''account_id={self.account_id}, visible_ratio={self._format_visible_ratio(result)}, duration={duration:.1f}s, skipped_polls={self._session_list_occluded_skips}, state={result.state.value}, reason={result.reason}'''
            if result.state in {
                WindowOcclusionState.VISIBLE,
                MonitorPollVisibilityState.VISIBLE}:
                self.logger.info(f'''微信窗口恢复可见，继续会话列表读取: {message}''')
            else:
                self.logger.warning(f'''微信窗口遮挡状态无法判断，按放行策略继续会话列表读取: {message}''')
            self._session_list_occluded_since = None
            self._session_list_occluded_skips = 0
        if result.state in {
            WindowOcclusionState.UNKNOWN,
            MonitorPollVisibilityState.UNKNOWN}:
            if self._last_occlusion_unknown_warning_at is None or now - self._last_occlusion_unknown_warning_at >= OCCLUSION_UNKNOWN_LOG_COOLDOWN_SECONDS:
                self.logger.warning(f'''微信窗口遮挡检测异常，按放行策略继续会话列表读取: account_id={self.account_id}, reason={result.reason}, cost={result.elapsed_ms:.3f}ms''')
                self._last_occlusion_unknown_warning_at = now
            else:
                self._last_occlusion_unknown_warning_at = None
        return False

    
    async def _run_monitor_cycle(self = None, JUST_CHECK = None):
        '''Run one poll and always publish progress, including quiet/occluded/offline cycles.'''
        self._telemetry.record_monitor_cycle_started(self.account_id)
        cycle_started_at = time.time()
        self._cycle_diagnostics = {
            'just_check_requested': bool(JUST_CHECK),
            'reply_mode': self._reply_mode,
            'detected_changes': 0,
            'tasks_created': 0 }
        outcome = 'ERROR'
        error = ''
    # WARNING: Decompyle incomplete

    
    async def _check_new_messages(self = None, JUST_CHECK = None):
        '''检查新消息'''
        pass
    # WARNING: Decompyle incomplete

    
    def _get_message_timestamp(self = None, time_str = None):
        '''转换消息时间为时间戳（秒级）'''
        session_recency_timestamp = session_recency_timestamp
        import WeRobotCore.application.session_time
        return session_recency_timestamp(time_str)

    
    async def _process_new_message(self = None, session = None, JUST_CHECK = None):
        '''处理新消息并创建任务'''
        pass
    # WARNING: Decompyle incomplete

    __classcell__ = None

