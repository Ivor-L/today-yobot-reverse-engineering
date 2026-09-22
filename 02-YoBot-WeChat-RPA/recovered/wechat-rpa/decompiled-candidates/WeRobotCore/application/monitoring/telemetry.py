# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: telemetry.marshal (Python 3.9)

'''Platform-neutral telemetry boundary for the shared chat monitor.

The mature Windows monitor keeps its in-memory watchdog health model.  A
platform composition may replace that implementation before monitoring starts
so importing or running the shared business workflow does not resolve a
Windows data directory on another operating system.
'''
from __future__ import annotations
from importlib import import_module
import logging
from typing import Any, Dict, Optional, Protocol, runtime_checkable
MonitorTelemetrySink = runtime_checkable(<NODE:12>)

class LegacyMonitorTelemetrySink:
    '''Lazy delegation to the existing Windows watchdog implementation.'''
    
    def _watchdog():
        return import_module('WeRobotCore.core.watchdog_state')

    _watchdog = staticmethod(_watchdog)
    
    def record_diagnostic_event(self = None, event_type = None, level = None, **details):
        pass
    # WARNING: Decompyle incomplete

    
    def record_monitor_cycle_started(self = None, account_id = None):
        self._watchdog().record_monitor_cycle_started(account_id)

    
    def record_monitor_cycle_finished(self = None, account_id = None, outcome = None, error = ('', None), details = {
        'account_id': 'str',
        'outcome': 'str',
        'error': 'str',
        'details': 'Optional[Dict[str, Any]]',
        'return': 'None' }):
        self._watchdog().record_monitor_cycle_finished(account_id, outcome, error, details, **('details',))

    
    def record_monitor_task_state(self = None, account_id = None, running = None, task_alive = {
        'account_id': 'str',
        'running': 'bool',
        'task_alive': 'bool',
        'return': 'None' }):
        self._watchdog().record_monitor_task_state(account_id, running, task_alive, **('running', 'task_alive'))

    
    def record_wechat_status(self = None, account_id = None, status = None, reason_code = (None, ''), message = {
        'account_id': 'str',
        'status': 'str',
        'reason_code': 'Optional[str]',
        'message': 'str',
        'details': 'Any',
        'return': 'None' }, **details):
        pass
    # WARNING: Decompyle incomplete



class DiagnosticReporterMonitorTelemetrySink:
    """Project monitor health events into an explicit runtime reporter.

    The reporter is normally ``ExplicitPathAutoReplyControlState`` on macOS.
    It owns path selection and redaction.  Unlike the Legacy adapter, this
    projection intentionally does not depend on the Windows watchdog's global
    in-memory state.
    """
    
    def __init__(self = None, reporter = None):
        if not callable(getattr(reporter, 'record_diagnostic', None)):
            raise TypeError('reporter must provide record_diagnostic')
        self._reporter = reporter

    
    def _record(self = None, event_type = None, **details):
        pass
    # WARNING: Decompyle incomplete

    
    def record_diagnostic_event(self = None, event_type = None, level = None, **details):
        pass
    # WARNING: Decompyle incomplete

    
    def record_monitor_cycle_started(self = None, account_id = None):
        self._record('MONITOR_CYCLE_STARTED', account_id, **('account_id',))

    
    def record_monitor_cycle_finished(self = None, account_id = None, outcome = None, error = ('', None), details = {
        'account_id': 'str',
        'outcome': 'str',
        'error': 'str',
        'details': 'Optional[Dict[str, Any]]',
        'return': 'None' }):
        if not outcome:
            pass
        if not error:
            pass
        if not details:
            pass
        self._record('MONITOR_CYCLE_FINISHED', account_id, str('OK').upper(), str('')[:1000], dict({ }), **('account_id', 'outcome', 'error', 'details'))

    
    def record_monitor_task_state(self = None, account_id = None, running = None, task_alive = {
        'account_id': 'str',
        'running': 'bool',
        'task_alive': 'bool',
        'return': 'None' }):
        self._record('MONITOR_TASK_STATE', account_id, bool(running), bool(task_alive), **('account_id', 'running', 'task_alive'))

    
    def record_wechat_status(self = None, account_id = None, status = None, reason_code = (None, ''), message = {
        'account_id': 'str',
        'status': 'str',
        'reason_code': 'Optional[str]',
        'message': 'str',
        'details': 'Any',
        'return': 'None' }, **details):
        if not message:
            pass
        self._record('WECHAT_RUNTIME_STATUS', account_id, status, reason_code, str('')[:500], details, **('account_id', 'status', 'reason_code', 'message', 'details'))



class NullMonitorTelemetrySink(DiagnosticReporterMonitorTelemetrySink):
    '''Side-effect-free fallback used only by an incomplete Mac candidate.'''
    
    class _NullReporter:
        
        def record_diagnostic(self = None, event_type = None, **details):
            pass


    
    def __init__(self = None):
        super().__init__(self._NullReporter())

    __classcell__ = None


def require_monitor_telemetry(value = None):
    if not value is None or isinstance(value, MonitorTelemetrySink):
        raise TypeError('telemetry must implement MonitorTelemetrySink')
    return value

__all__ = [
    'DiagnosticReporterMonitorTelemetrySink',
    'LegacyMonitorTelemetrySink',
    'MonitorTelemetrySink',
    'NullMonitorTelemetrySink',
    'require_monitor_telemetry']
