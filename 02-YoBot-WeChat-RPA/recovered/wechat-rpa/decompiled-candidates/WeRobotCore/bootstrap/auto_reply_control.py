# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_reply_control.marshal (Python 3.9)

'''Side-effect-free composition for the mature auto-reply control plane.'''
import time
from typing import Any, Callable, Mapping, Optional
from WeRobotCore.adapters.control import LegacyAutoReplyAccountInventory, LegacyAutoReplyDesiredStateStore, LegacyAutoReplyInstanceManager, LegacyAutoReplyRuntimeReporter
from WeRobotCore.application.auto_reply import AutoReplyControlService, AutoReplyMonitorController
from WeRobotCore.application.auto_reply.config_readiness import AutoReplyConfigurationFacade, ConfiguredAutoReplyReadinessProvider, PrivateAgentCapabilityProbe

def create_legacy_auto_reply_control_service(*, instance_manager_factory, config_factory, private_agent_probe, monitor, load_feature_state, save_auto_reply_intent, record_diagnostic_event, set_runtime_phase, append_watchdog_event, clock):
    '''Build one request-scoped service without reading configuration/state.'''
    return AutoReplyControlService(LegacyAutoReplyAccountInventory(instance_manager_factory), ConfiguredAutoReplyReadinessProvider(config_factory, private_agent_probe, clock, **('config_factory', 'private_agent_probe', 'clock')), monitor, LegacyAutoReplyDesiredStateStore(load_feature_state, save_auto_reply_intent), LegacyAutoReplyRuntimeReporter(record_diagnostic_event, set_runtime_phase, append_watchdog_event), **('account_inventory', 'readiness_provider', 'monitor', 'desired_state', 'reporter'))

