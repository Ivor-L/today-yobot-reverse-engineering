# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_process.marshal (Python 3.9)

'''Bind one prepared macOS Host to its process-owned task lifecycle.

This is the final no-server ownership check before the signed entry may call
the runner.  Binding adds FastAPI startup/shutdown handlers in memory only; it
does not start the lifecycle, create storage, open a socket, access Keychain,
or inspect WeChat.
'''
from __future__ import annotations
import asyncio
from dataclasses import dataclass
from typing import Optional
from fastapi import FastAPI
from WeRobotCore.bootstrap.macos_control_process import MacOSControlProcessDependencies, MacOSTaskSystemLifecycle
from WeRobotCore.bootstrap.macos_control_product import MacOSControlProductOwner
from macos_runtime import MacOSControlRuntimePreparation
_PROCESS_RUNTIME_STATE_KEY = 'yokowebot_macos_process_runtime'
MacOSControlProcessRuntime = dataclass(True, **('frozen',))(<NODE:12>)

def bind_macos_control_process_runtime(*, preparation, product_owner, dependencies):
    '''Attach exactly one matching lifecycle to the prepared Host.'''
    if not isinstance(preparation, MacOSControlRuntimePreparation):
        raise TypeError('preparation must be MacOSControlRuntimePreparation')
    if not isinstance(product_owner, MacOSControlProductOwner):
        raise TypeError('product_owner must be MacOSControlProductOwner')
    if not isinstance(dependencies, MacOSControlProcessDependencies):
        raise TypeError('dependencies must be MacOSControlProcessDependencies')
    launch_plan = preparation.launch_plan
    app = launch_plan.host.app
    if not isinstance(app, FastAPI):
        raise TypeError('prepared Host must contain a FastAPI app')
    publication = product_owner.publication
    if publication is None:
        raise RuntimeError('macOS product owner has not published its graph')
    if launch_plan.host.publication is not publication:
        raise RuntimeError('prepared Host belongs to another product owner')
    if launch_plan.inputs.app_paths != product_owner.paths:
        raise RuntimeError('launch inputs and product owner paths differ')
    if dependencies.paths != product_owner.paths:
        raise RuntimeError('process dependencies and product owner paths differ')
    if product_owner.auto_reply_manager is not dependencies.auto_reply_manager:
        raise RuntimeError('product owner uses another AutoReplyManager')
    if product_owner.multi_chat_monitor is not dependencies.multi_chat_monitor:
        raise RuntimeError('product owner uses another MultiChatMonitor')
    if product_owner.private_agent_probe is not dependencies.private_agent_probe:
        raise RuntimeError('product owner uses another private Agent probe')
    lifecycle = dependencies.task_system_lifecycle
    if lifecycle.state != 'new':
        raise RuntimeError('task system lifecycle must be new when bound')
    if getattr(app.state, _PROCESS_RUNTIME_STATE_KEY, None) is not None:
        raise RuntimeError('prepared Host already has a process runtime')
    runtime = MacOSControlProcessRuntime(preparation, product_owner, dependencies, app, lifecycle, **('preparation', 'product_owner', 'dependencies', 'app', 'task_system_lifecycle'))
    runtime_lease_owner = preparation.runtime_lease_owner
    helper_client = publication.composition.runtime_bundle.helper_client
    access_authorizer = preparation.access_authorizer
    if access_authorizer is None and runtime_lease_owner is not None:
        access_authorizer = runtime_lease_owner.authorize
    if launch_plan.inputs.backend_mode and access_authorizer is None:
        raise RuntimeError('macOS plugin requires a business access authorizer')
    if access_authorizer is not None:
        bind_task_authorizer = getattr(dependencies.scheduler, 'bind_execution_authorizer', None)
        if not callable(bind_task_authorizer):
            raise RuntimeError('macOS Scheduler does not expose the runtime access gate')
        if getattr(dependencies.scheduler, 'execution_authorizer_bound', False):
            raise RuntimeError('macOS Scheduler access gate is already bound')
        if helper_client.access_authorizer_bound:
            raise RuntimeError('macOS Helper access gate is already bound')
        bind_task_authorizer(access_authorizer)
        helper_client.bind_access_authorizer(access_authorizer)
    business_stop_lock = None
    
    def stop_lock():
        if business_stop_lock is None:
            business_stop_lock = asyncio.Lock()
        return business_stop_lock

    
    async def stop_business():
        pass
    # WARNING: Decompyle incomplete

    
    async def stop_business_for_access_loss(_code = None):
        await stop_business()

    
    async def shutdown_after_unbind():
        import os
        import signal
        
        try:
            await stop_business()
        finally:
            os.kill(os.getpid(), signal.SIGTERM)
        return None


    app.state.license_shutdown = shutdown_after_unbind
    
    async def startup_runtime():
        if runtime_lease_owner is not None:
            await runtime_lease_owner.acquire()
            verification = <NODE:28>
            if not verification.granted:
                await runtime_lease_owner.stop()
                raise RuntimeError('macOS Control runtime lease rejected: {}'.format(verification.code))
    # WARNING: Decompyle incomplete

    
    async def shutdown_runtime():
        business_error = None
    # WARNING: Decompyle incomplete

    app.add_event_handler('startup', startup_runtime)
    app.add_event_handler('shutdown', shutdown_runtime)
    setattr(app.state, _PROCESS_RUNTIME_STATE_KEY, runtime)
    return runtime

__all__ = [
    'MacOSControlProcessRuntime',
    'bind_macos_control_process_runtime']
