# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: startup.marshal (Python 3.9)

'''Windows Legacy projection for the platform-neutral Startup workflow.

The adapter consumes only already-isolated inventory, initialization and
startup-operation boundaries.  It does not import FastAPI, ``api_server`` or
native Windows/UIA modules.  A later composition batch may bind the mature
Route owners without moving their implementation into this module.
'''
from typing import Any, Mapping, Protocol, Tuple, runtime_checkable
from WeRobotCore.application.instances import InstanceInitializationOutcome, InstanceInventorySnapshot, InstanceInventorySource
from WeRobotCore.application.startup import StartupAction, StartupActionAvailability, StartupCommand, StartupCompatibilityMode, StartupExecutionResult, StartupGuidance, StartupInstanceState, StartupInstanceStatus, StartupPhase, StartupWorkflowSnapshot
from WeRobotCore.domain import ErrorCode, InstanceState
from initialization_compatibility import WindowsLegacyInitializationRun
from mappers import WINDOWS_LEGACY_DRIVER_ID
WINDOWS_STARTUP_DRIVER_ID = WINDOWS_LEGACY_DRIVER_ID
WindowsLegacyStartupOperations = runtime_checkable(<NODE:12>)

def _startup_actions(*, initialize_available, configure_available):
    return (StartupActionAvailability(StartupAction.LAUNCH, True, 'single launch is non-destructive; closing running clients for multi-launch requires command confirmation', **('action', 'available', 'hint')), StartupActionAvailability(StartupAction.INITIALIZE, initialize_available, None if initialize_available else 'WECHAT_NOT_RUNNING', 'initialize the detected signed-in WeChat instances' if initialize_available else 'launch or manually open WeChat first', **('action', 'available', 'reason_code', 'hint')), StartupActionAvailability(StartupAction.CONFIGURE_ACCESSIBILITY, configure_available, True, True, None if configure_available else 'INITIALIZATION_EVIDENCE_REQUIRED', 'configuration closes and relaunches all WeChat clients' if configure_available else 'run initialization before compatibility configuration', **('action', 'available', 'destructive', 'confirmation_required', 'reason_code', 'hint')), StartupActionAvailability(StartupAction.REQUEST_PERMISSION, False, 'WINDOWS_PERMISSION_NOT_REQUESTABLE', 'Windows accessibility compatibility is configured by the backend', **('action', 'available', 'reason_code', 'hint')))


def _inventory_instances(snapshot = None):
    result = []
    for item in snapshot.items:
        instance = item.instance
        if instance.state is InstanceState.READY and bool(instance.account_id):
            pass
        ready = bool(instance.nickname)
        result.append(StartupInstanceStatus(instance.instance_id.value, StartupInstanceState.READY if ready else StartupInstanceState.DISCOVERED, instance.account_id, instance.nickname, **('instance_id', 'state', 'account_id', 'nickname')))
    return tuple(result)


def _outcome_instances(outcome = None):
    result = []
    for item in outcome.batch.results:
        if item.success:
            state = StartupInstanceState.READY
        elif item.required_actions:
            state = StartupInstanceState.ACTION_REQUIRED
        else:
            state = StartupInstanceState.FAILED
        result.append(StartupInstanceStatus(item.instance_id.value, state, item.account_id, item.nickname, item.failure_code, item.message, item.retryable, **('instance_id', 'state', 'account_id', 'nickname', 'reason_code', 'message', 'retryable')))
    return tuple(result)


def _guidance(payload = None):
    raw = payload.get('guidance')
    if not isinstance(raw, Mapping):
        raise ValueError('Windows startup response omitted guidance')
    if not raw.get('fix_steps'):
        pass
    steps = ()
    if isinstance(steps, (str, bytes)):
        raise TypeError('guidance fix_steps must be a sequence')
    return StartupGuidance(raw.get('title'), raw.get('reason'), tuple(steps), raw.get('download_url'), raw.get('download_label'), **('title', 'reason', 'steps', 'action_url', 'action_label'))


class WindowsLegacyStartupBackend:
    '''Map the mature Windows startup workflow onto one normalized contract.'''
    
    def __init__(self = None, *, inventory, operations):
        if not isinstance(inventory, InstanceInventorySource):
            raise TypeError('inventory must implement InstanceInventorySource')
        if not isinstance(operations, WindowsLegacyStartupOperations):
            raise TypeError('operations must implement WindowsLegacyStartupOperations')
        self._inventory = inventory
        self._operations = operations

    
    async def inspect(self = None):
        await self._inventory.snapshot()
        inventory = <NODE:28>
        if not isinstance(inventory, InstanceInventorySnapshot):
            raise TypeError('inventory source returned an invalid snapshot')
        if inventory.driver_id != WINDOWS_STARTUP_DRIVER_ID:
            raise ValueError('Windows startup requires the Windows Legacy driver')
        instances = _inventory_instances(inventory)
        if not instances:
            return StartupWorkflowSnapshot('windows', inventory.driver_id, StartupPhase.NO_INSTANCE, _startup_actions(False, False, **('initialize_available', 'configure_available')), StartupAction.LAUNCH, 'WECHAT_NOT_RUNNING', 'no running WeChat instance was detected', **('platform', 'driver_id', 'phase', 'actions', 'next_action', 'reason_code', 'message'))
        return None('windows', inventory.driver_id, StartupPhase.INITIALIZATION_REQUIRED, instances, _startup_actions(True, False, **('initialize_available', 'configure_available')), StartupAction.INITIALIZE, 'detected WeChat instances require startup initialization', **('platform', 'driver_id', 'phase', 'instances', 'actions', 'next_action', 'message'))

    
    async def execute(self = None, command = None):
        if not isinstance(command, StartupCommand):
            raise TypeError('command must be a StartupCommand')
        if command.action is StartupAction.LAUNCH:
            await self._launch(command)
            return <NODE:28>
        if None.action is StartupAction.INITIALIZE:
            await self._initialize()
            return <NODE:28>
        if None.action is StartupAction.CONFIGURE_ACCESSIBILITY:
            await self._configure(command)
            return <NODE:28>
        return None(command.action, False, ErrorCode.CAPABILITY_UNAVAILABLE, 'WINDOWS_PERMISSION_NOT_REQUESTABLE', 'Windows cannot request this permission through Startup', **('action', 'success', 'code', 'reason_code', 'message'))

    
    async def _launch(self = None, command = None):
        await self._operations.launch_wechat(command.launch_count, command.close_existing, False, **('count', 'close_existing', 'enable_narrator'))
        raw = <NODE:28>
        if not isinstance(raw, Mapping):
            raise TypeError('Windows launch operation must return a mapping')
        status = raw.get('status')
        if status == 'launched':
            if not raw.get('message'):
                pass
            snapshot = StartupWorkflowSnapshot('windows', WINDOWS_STARTUP_DRIVER_ID, StartupPhase.LOGIN_REQUIRED, _startup_actions(True, False, **('initialize_available', 'configure_available')), StartupAction.INITIALIZE, str('WeChat launched; login is required'), {
                'legacy_launch': dict(raw) }, **('platform', 'driver_id', 'phase', 'actions', 'next_action', 'message', 'compatibility_payload'))
            if not snapshot.message:
                pass
            return StartupExecutionResult(StartupAction.LAUNCH, True, ErrorCode.OK, '', snapshot, **('action', 'success', 'code', 'message', 'snapshot'))
        if not raw.get('code'):
            pass
        reason_code = None('LAUNCH_FAILED')
        if not raw.get('message'):
            pass
        return StartupExecutionResult(StartupAction.LAUNCH, False, ErrorCode.INSTANCE_NOT_FOUND if reason_code == 'WECHAT_PATH_NOT_FOUND' else ErrorCode.OPERATION_FAILED, reason_code, str('failed to launch WeChat'), True, **('action', 'success', 'code', 'reason_code', 'message', 'retryable'))

    
    async def _initialize(self = None):
        await self._operations.initialize_wechat()
        run = <NODE:28>
        if not isinstance(run, WindowsLegacyInitializationRun):
            raise TypeError('Windows initialization operation returned an invalid run')
        projection = run.projection
        outcome = run.outcome
        if projection.error_detail is not None:
            return StartupExecutionResult(StartupAction.INITIALIZE, False, ErrorCode.INSTANCE_NOT_FOUND if outcome.total == 0 else ErrorCode.OPERATION_FAILED, 'WECHAT_NOT_RUNNING' if outcome.total == 0 else 'INITIALIZATION_FAILED', projection.error_detail, True, **('action', 'success', 'code', 'reason_code', 'message', 'retryable'))
        payload = None.payload
        if not isinstance(payload, Mapping):
            raise ValueError('Windows initialization projection omitted payload')
        instances = _outcome_instances(outcome)
        reason_code = payload.get('code')
        if reason_code == 'WECHAT_VERSION_UNSUPPORTED':
            if not payload.get('message'):
                pass
            snapshot = StartupWorkflowSnapshot('windows', outcome.inventory.driver_id, StartupPhase.BLOCKED, instances, _startup_actions(True, False, **('initialize_available', 'configure_available')), reason_code, str('unsupported WeChat version'), _guidance(payload), {
                'legacy_initialization': dict(payload) }, **('platform', 'driver_id', 'phase', 'instances', 'actions', 'reason_code', 'message', 'guidance', 'compatibility_payload'))
            if not snapshot.message:
                pass
            return StartupExecutionResult(StartupAction.INITIALIZE, False, ErrorCode.CLIENT_VERSION_UNSUPPORTED, reason_code, '', snapshot, **('action', 'success', 'code', 'reason_code', 'message', 'snapshot'))
        configuration_required = None(payload.get('need_auto_config'))
        phase = StartupPhase.CONFIGURATION_REQUIRED if configuration_required else StartupPhase.READY
        if not payload.get('message'):
            pass
        snapshot = StartupWorkflowSnapshot('windows', outcome.inventory.driver_id, phase, instances, _startup_actions(True, configuration_required, **('initialize_available', 'configure_available')), StartupAction.CONFIGURE_ACCESSIBILITY if configuration_required else None, str(reason_code) if reason_code else None, str(''), {
            'legacy_initialization': dict(payload) }, **('platform', 'driver_id', 'phase', 'instances', 'actions', 'next_action', 'reason_code', 'message', 'compatibility_payload'))
        if payload.get('success'):
            if not snapshot.message:
                pass
            return StartupExecutionResult(StartupAction.INITIALIZE, True, ErrorCode.OK, '', snapshot, **('action', 'success', 'code', 'message', 'snapshot'))
        if not reason_code:
            pass
        if not snapshot.message:
            pass
        return None(StartupAction.INITIALIZE, False, ErrorCode.CAPABILITY_UNAVAILABLE, str('INITIALIZATION_FAILED'), 'initialization requires configuration', True, snapshot, **('action', 'success', 'code', 'reason_code', 'message', 'retryable', 'snapshot'))

    
    async def _configure(self = None, command = None):
        await self._operations.configure_accessibility(command.compatibility_mode is StartupCompatibilityMode.DEFAULT, **('force_narrator',))
        raw = <NODE:28>
        if not isinstance(raw, Mapping):
            raise TypeError('Windows configuration operation must return a mapping')
        if raw.get('success'):
            if not raw.get('message'):
                pass
            snapshot = StartupWorkflowSnapshot('windows', WINDOWS_STARTUP_DRIVER_ID, StartupPhase.LOGIN_REQUIRED, _startup_actions(True, False, **('initialize_available', 'configure_available')), StartupAction.INITIALIZE, str('login is required after configuration'), {
                'legacy_configuration': dict(raw) }, **('platform', 'driver_id', 'phase', 'actions', 'next_action', 'message', 'compatibility_payload'))
            if not snapshot.message:
                pass
            return StartupExecutionResult(StartupAction.CONFIGURE_ACCESSIBILITY, True, ErrorCode.OK, '', snapshot, **('action', 'success', 'code', 'message', 'snapshot'))
        if not raw.get('message'):
            pass
        snapshot = None('windows', WINDOWS_STARTUP_DRIVER_ID, StartupPhase.CONFIGURATION_REQUIRED, _startup_actions(True, True, **('initialize_available', 'configure_available')), StartupAction.CONFIGURE_ACCESSIBILITY, 'ACCESSIBILITY_CONFIGURATION_FAILED', str('accessibility configuration failed'), {
            'legacy_configuration': dict(raw) }, **('platform', 'driver_id', 'phase', 'actions', 'next_action', 'reason_code', 'message', 'compatibility_payload'))
        if not snapshot.message:
            pass
        return StartupExecutionResult(StartupAction.CONFIGURE_ACCESSIBILITY, False, ErrorCode.OPERATION_FAILED, 'ACCESSIBILITY_CONFIGURATION_FAILED', '', True, snapshot, **('action', 'success', 'code', 'reason_code', 'message', 'retryable', 'snapshot'))


