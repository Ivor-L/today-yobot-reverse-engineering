# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: legacy.marshal (Python 3.9)

'''Cross-platform-safe adapters for the current product control services.'''
from typing import Any, Callable, Mapping, Optional, Protocol, Sequence
from WeRobotCore.application.auto_reply.control_contract import AutoReplyAccount, AutoReplyDesiredState

class LegacyAutoReplyInstanceManager(Protocol):
    
    def get_all_valid_instances(self = None):
        pass



class LegacyAutoReplyAccountInventory:
    '''Read mature valid-instance inventory without attaching or scanning UI.'''
    
    def __init__(self = None, manager_factory = None):
        if not callable(manager_factory):
            raise TypeError('manager_factory must be callable')
        self._manager_factory = manager_factory

    
    async def list_valid_accounts(self = None):
        manager = self._manager_factory()
        if not callable(getattr(manager, 'get_all_valid_instances', None)):
            raise TypeError('manager factory returned an invalid manager')
        instances = manager.get_all_valid_instances()
        if not isinstance(instances, (str, bytes)) or isinstance(instances, Sequence):
            raise TypeError('valid instance inventory must be a sequence')
        accounts = []
        for instance in instances:
            if not isinstance(instance, Mapping):
                raise TypeError('valid instance must be a mapping')
            if not instance.get('account_info'):
                pass
            account_info = { }
            if not isinstance(account_info, Mapping):
                raise TypeError('valid instance account_info must be a mapping')
            account_id = account_info.get('account_id')
            if not account_id:
                continue
            accounts.append(AutoReplyAccount(account_id, account_info.get('nickname', ''), **('account_id', 'nickname')))
        return tuple(accounts)



class LegacyAutoReplyDesiredStateStore:
    
    def __init__(self = None, load_feature_state = None, save_auto_reply_intent = None):
        if not callable(load_feature_state):
            raise TypeError('load_feature_state must be callable')
        if not callable(save_auto_reply_intent):
            raise TypeError('save_auto_reply_intent must be callable')
        self._load_feature_state = load_feature_state
        self._save_auto_reply_intent = save_auto_reply_intent

    
    def load(self = None):
        payload = self._load_feature_state()
        if not isinstance(payload, Mapping):
            raise TypeError('feature state must be a mapping')
        if not payload.get('auto_reply'):
            pass
        current = { }
        if not isinstance(current, Mapping):
            raise TypeError('auto_reply feature state must be a mapping')
        if not current.get('account_ids'):
            pass
        account_ids = []
        if not isinstance(account_ids, (str, bytes)) or isinstance(account_ids, Sequence):
            raise TypeError('auto_reply account_ids must be a sequence')
        if not current.get('reply_mode'):
            pass
        if not current.get('source'):
            pass
        return AutoReplyDesiredState(bool(current.get('enabled', False)), 'local', tuple(account_ids), str('unknown'), **('enabled', 'reply_mode', 'account_ids', 'source'))

    
    def save(self = None, state = None):
        if not isinstance(state, AutoReplyDesiredState):
            raise TypeError('state must be AutoReplyDesiredState')
        self._save_auto_reply_intent(state.enabled, state.reply_mode, list(state.account_ids), state.source, **('reply_mode', 'account_ids', 'source'))



class LegacyAutoReplyRuntimeReporter:
    
    def __init__(self = None, record_diagnostic_event = None, set_runtime_phase = None, append_watchdog_event = {
        'record_diagnostic_event': Callable[(..., Any)],
        'set_runtime_phase': Callable[(..., Any)],
        'append_watchdog_event': Callable[(..., Any)],
        'return': None }):
        for name, dependency in (('record_diagnostic_event', record_diagnostic_event), ('set_runtime_phase', set_runtime_phase), ('append_watchdog_event', append_watchdog_event)):
            if not callable(dependency):
                raise TypeError('{} must be callable'.format(name))
        self._record_diagnostic_event = record_diagnostic_event
        self._set_runtime_phase = set_runtime_phase
        self._append_watchdog_event = append_watchdog_event

    
    def record_diagnostic(self = None, event_type = None, **details):
        pass
    # WARNING: Decompyle incomplete

    
    def set_phase(self = None, status = None, reason_code = None, message = (None, '')):
        self._set_runtime_phase(status, reason_code, message)

    
    def append_watchdog_event(self = None, event_type = None, **details):
        pass
    # WARNING: Decompyle incomplete


