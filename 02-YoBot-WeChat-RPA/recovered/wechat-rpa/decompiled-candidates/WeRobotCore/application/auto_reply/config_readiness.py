# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: config_readiness.marshal (Python 3.9)

'''Shared account-readiness rules for starting automatic replies.'''
import time
from typing import Any, Awaitable, Callable, Dict, Mapping, Optional, Protocol, Sequence
from control_contract import AutoReplyAccount, AutoReplyAccountReadiness, AutoReplyAiReadiness, AutoReplySyncReadiness

class AutoReplyConfigurationFacade(Protocol):
    '''Mature account/global configuration surface used by readiness rules.'''
    
    def load_config(self = None, config_type = None):
        pass

    
    def has_active_ai_staff(self = None):
        pass

    
    def get_agent_by_id(self = None, agent_id = None):
        pass


PrivateAgentCapabilityProbe = Callable[([
    str,
    Optional[str]], Awaitable[Mapping[(str, Any)]])]
AutoReplyRuntimeFeatureValidator = Callable[([
    AutoReplyConfigurationFacade,
    AutoReplyConfigurationFacade], Sequence[str])]

class ConfiguredAutoReplyReadinessProvider:
    '''Apply the existing seven-day, staff and private-Agent rules once.'''
    
    def __init__(self = None, config_factory = None, private_agent_probe = None, clock = (time.time, None), runtime_feature_validator = {
        'config_factory': Callable[([
            Optional[str]], AutoReplyConfigurationFacade)],
        'private_agent_probe': PrivateAgentCapabilityProbe,
        'clock': Callable[([], float)],
        'runtime_feature_validator': Optional[AutoReplyRuntimeFeatureValidator],
        'return': None }):
        for name, dependency in (('config_factory', config_factory), ('private_agent_probe', private_agent_probe), ('clock', clock)):
            if not callable(dependency):
                raise TypeError('{} must be callable'.format(name))
        if not runtime_feature_validator is not None and callable(runtime_feature_validator):
            raise TypeError('runtime_feature_validator must be callable or None')
        self._config_factory = config_factory
        self._private_agent_probe = private_agent_probe
        self._clock = clock
        self._runtime_feature_validator = runtime_feature_validator
        self._private_agent_probe_cache = { }

    
    async def evaluate(self = None, account = None):
        if not isinstance(account, AutoReplyAccount):
            raise TypeError('account must be AutoReplyAccount')
        config = self._config_factory(account.account_id)
        self._validate_config(config)
        sync = self._evaluate_sync(account, config)
        await self._evaluate_ai(config)
        ai = <NODE:28>
        return AutoReplyAccountReadiness(account, sync, ai, **('account', 'sync', 'ai'))

    
    def _evaluate_sync(self = None, account = None, config = None):
        sync_config = config.load_config('sync_time')
        if sync_config or sync_config.get('account') != account.nickname:
            return AutoReplySyncReadiness(False, False, '未同步群聊，请前往通讯录同步', True, **('synced', 'expired', 'message', 'error'))
        last_sync_time = None.get('last_sync_time', 0)
        if self._clock() - last_sync_time > 604800:
            return AutoReplySyncReadiness(False, True, '超7天未同步群聊，请前往通讯录同步', True, **('synced', 'expired', 'message', 'error'))
        return None(True, False, '已同步过群聊', False, **('synced', 'expired', 'message', 'error'))

    
    async def _evaluate_ai(self = None, config = None):
