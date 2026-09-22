# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_runner.marshal (Python 3.9)

'''Explicit final runner seam for one prepared macOS Control runtime.

Importing this module does not resolve process inputs, access secrets, publish
capabilities, create a server, or open a socket.  The signed product entry may
call :func:`serve_prepared_macos_control_runtime` only after the asynchronous
preparation gate has returned one coherent runtime graph.
'''
from __future__ import annotations
from typing import Optional
from macos_process import MacOSControlProcessRuntime
from macos_runtime import MacOSControlRuntimePreparation
from server import ControlHostServerFactory, serve_control_host

def serve_prepared_macos_control_runtime(prepared = None, *, server_factory):
    '''Serve exactly the Host and settings retained by ``prepared``.

    There is deliberately no retry, alternate port, background task, implicit
    shutdown handler, environment lookup, capability change or authorization
    bypass here.  Those policies remain owned by the product entry and the
    already-composed Control Host.
    '''
    if not isinstance(prepared, MacOSControlRuntimePreparation):
        raise TypeError('prepared must be MacOSControlRuntimePreparation')
    launch_plan = prepared.launch_plan
    serve_control_host(launch_plan.host.app, launch_plan.inputs.server_settings, server_factory, **('server_factory',))


def serve_macos_control_process_runtime(runtime = None, *, server_factory):
    '''Serve only a Host whose product/process/lifecycle identities match.'''
    if not isinstance(runtime, MacOSControlProcessRuntime):
        raise TypeError('runtime must be MacOSControlProcessRuntime')
    if runtime.task_system_lifecycle.state != 'new':
        raise RuntimeError('task system lifecycle is not ready for server startup')
    serve_prepared_macos_control_runtime(runtime.preparation, server_factory, **('server_factory',))

__all__ = [
    'serve_macos_control_process_runtime',
    'serve_prepared_macos_control_runtime']
