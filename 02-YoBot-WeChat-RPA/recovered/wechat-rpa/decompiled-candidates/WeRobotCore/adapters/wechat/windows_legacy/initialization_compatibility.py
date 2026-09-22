# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: initialization_compatibility.marshal (Python 3.9)

'''Legacy HTTP/diagnostic compatibility around shared initialization.

The projection is deliberately independent of FastAPI and Pydantic.  The
future 3E Route will either return ``payload`` or raise its existing
``HTTPException(status_code, detail=error_detail)`` without changing paths,
authentication or public fields.
'''
import inspect
from dataclasses import dataclass
from typing import Any, Callable, Mapping, Optional, Protocol
from WeRobotCore.application.instances import InstanceInitializationBatch, InstanceInitializationOutcome, InstanceInitializationPostHook, InstanceInitializationReporter, InstanceInventorySnapshot
from WeRobotCore.application.instances.inventory import thaw_compatibility_value
WindowsLegacyInitializationProjection = dataclass(True, **('frozen',))(<NODE:12>)
WindowsLegacyInitializationRun = dataclass(True, **('frozen',))(<NODE:12>)

def _batch_compatibility(outcome = None):
    return thaw_compatibility_value(outcome.batch.compatibility_payload)


def _result_compatibility(result = None, key = None):
    payload = thaw_compatibility_value(result.compatibility_payload)
    value = payload.get(key)
    if not isinstance(value, Mapping):
        raise ValueError('initialization result omitted {}'.format(key))
    return dict(value)


def project_windows_legacy_initialization(outcome = None):
    '''Project the reviewed ``/api/init/multi`` success/business envelopes.'''
    if not isinstance(outcome, InstanceInitializationOutcome):
        raise TypeError('outcome must be an InstanceInitializationOutcome')
    if outcome.total == 0:
        return WindowsLegacyInitializationProjection(400, '未检测到任何微信实例，请确保微信已启动', **('status_code', 'error_detail'))
    compatibility = None(outcome)
    rejection = compatibility.get('global_rejection')
    if isinstance(rejection, Mapping) and rejection.get('kind') == 'wechat_version_unsupported':
        classification = rejection.get('classification')
        if not isinstance(classification, Mapping):
            raise ValueError('version rejection omitted classification')
        detected = classification.get('detected')
        minimum = classification.get('min')
        maximum = classification.get('max')
        recommended = classification.get('recommended')
        return WindowsLegacyInitializationProjection(200, {
            'success': False,
            'code': 'WECHAT_VERSION_UNSUPPORTED',
            'message': '检测到微信版本 {}，超出当前支持范围（{} ~ {}）。请改用受支持的版本（推荐 {}，最稳定）。'.format(detected, minimum, maximum, recommended),
            'version_info': {
                'detected': detected,
                'min': minimum,
                'max': maximum,
                'recommended': recommended },
            'guidance': {
                'title': '微信版本过高',
                'reason': '目前适配微信 {} ~ {}，当前版本 {}。'.format(minimum, maximum, detected),
                'fix_steps': [
                    '下载受支持版本（推荐 {}，最稳定）'.format(recommended),
                    '安装后重新登录微信，再启动 BOT 服务'],
                'download_url': classification.get('download_url'),
                'download_label': '下载受支持的微信版本' } }, **('status_code', 'payload'))
    successes = None.batch.successes
    failures = outcome.batch.failures
    failed_instances = tuple((lambda .0: for item in .0:
_result_compatibility(item, 'legacy_failed_info'))(failures))
    accessibility = compatibility.get('accessibility')
    accessibility = dict(accessibility) if isinstance(accessibility, Mapping) else { }
# WARNING: Decompyle incomplete


class WindowsLegacySchedulerPostHook(InstanceInitializationPostHook):
    '''Adapt the existing possibly-async Scheduler initializer.'''
    
    def __init__(self = None, initializer = None):
        if not callable(initializer):
            raise TypeError('initializer must be callable')
        self._initializer = initializer

    
    async def run(self = None, batch = None):
        if not isinstance(batch, InstanceInitializationBatch):
            raise TypeError('batch must be an InstanceInitializationBatch')
        result = self._initializer()
        if inspect.isawaitable(result):
            await result
            result = <NODE:28>
        return bool(result)



class WindowsLegacyInitializationReporter(InstanceInitializationReporter):
    '''Preserve existing diagnostic event names in the Windows adapter.'''
    
    def __init__(self = None, recorder = None):
        if not callable(recorder):
            raise TypeError('recorder must be callable')
        self._recorder = recorder

    
    def requested(self = None, inventory = None):
        instances = []
        for item in inventory.items:
            raw = item.compatibility_payload
            account_info = raw.get('account_info')
            account_info = account_info if isinstance(account_info, Mapping) else { }
            instances.append({
                'instance_id': item.instance.instance_id.value,
                'account_id': account_info.get('account_id'),
                'process_id': raw.get('process_id'),
                'window_handle': raw.get('window_handle'),
                'initialized': bool(raw.get('initialized')),
                'hot_attached': bool(raw.get('hot_attached')) })
        self._recorder('INIT_MULTI_REQUESTED', len(inventory.items), instances, **('instance_count', 'instances'))

    
    def completed(self = None, outcome = None):
        compatibility = _batch_compatibility(outcome)
        if outcome.total == 0 or compatibility.get('global_rejection'):
            return None
        None._recorder('INIT_MULTI_RESULT', outcome.total, outcome.success_count, outcome.failure_count, bool(compatibility.get('env_error_detected')), (lambda .0: [ item.account_id for item in .0 if item.account_id ])(outcome.batch.successes), **('total', 'success', 'failed', 'env_error_detected', 'accounts'))

    
    def failed(self = None, error = None):
        self._recorder('INIT_MULTI_FAILED', 500, str(error)[:1000], **('status_code', 'error'))



class _InitializationService(Protocol):
    
    async def initialize(self = None):
        pass



class WindowsLegacyInitializationCoordinator:
    '''Place Windows request setup/Narrator cleanup around the shared Service.'''
    
    def __init__(self = None, *, service, clear_deferred_activation, stop_narrator_best_effort, record_diagnostic):
        if not callable(getattr(service, 'initialize', None)):
            raise TypeError('service must provide initialize')
        for name, callback in (('clear_deferred_activation', clear_deferred_activation), ('stop_narrator_best_effort', stop_narrator_best_effort), ('record_diagnostic', record_diagnostic)):
            if not callable(callback):
                raise TypeError('{} must be callable'.format(name))
        self._service = service
        self._clear_deferred_activation = clear_deferred_activation
        self._stop_narrator_best_effort = stop_narrator_best_effort
        self._record_diagnostic = record_diagnostic

    
    async def initialize_run(self = None):
        pass
    # WARNING: Decompyle incomplete

    
    async def initialize(self = None):
        '''Preserve the mature Route-facing result while sharing its outcome.'''
        await self.initialize_run()
        return <NODE:28>.projection


