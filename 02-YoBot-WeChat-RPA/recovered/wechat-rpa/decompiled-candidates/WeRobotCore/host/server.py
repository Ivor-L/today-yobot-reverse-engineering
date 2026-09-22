# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: server.marshal (Python 3.9)

'''Explicit, loopback-only server lifecycle for the shared Control Host.

Importing this module never imports Uvicorn or opens a socket.  The concrete
server is created only by an explicit ``serve_control_host`` call, which keeps
the macOS product entry point default-off until its release gates are closed.
'''
from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Callable, Optional, Protocol
_LOOPBACK_HOSTS = frozenset(('127.0.0.1', '::1'))
_LOG_LEVELS = frozenset(('critical', 'error', 'warning', 'info', 'debug', 'trace'))
ControlHostServerSettings = dataclass(True, **('frozen',))(<NODE:12>)

class ControlHostServerBackend(Protocol):
    '''Small synchronous boundary implemented by ``uvicorn.Server``.'''
    
    def run(self = None):
        pass


ControlHostServerFactory = Callable[([
    Any,
    ControlHostServerSettings], ControlHostServerBackend)]

def create_uvicorn_server(app = None, settings = None):
    '''Create, but do not run, the concrete Uvicorn server lazily.'''
    if not callable(app):
        raise TypeError('app must be an ASGI callable')
    if not isinstance(settings, ControlHostServerSettings):
        raise TypeError('settings must be ControlHostServerSettings')
    import uvicorn
    config = uvicorn.Config(app, settings.host, settings.port, settings.log_level, settings.access_log, False, False, 1, **('host', 'port', 'log_level', 'access_log', 'proxy_headers', 'server_header', 'workers'))
    return uvicorn.Server(config)


def serve_control_host(app = None, settings = None, *, server_factory):
    '''Run exactly one server; propagate construction/runtime failures.

    There is intentionally no retry, fallback port, background thread, process
    spawning or environment lookup in this layer.  Those are supervisor and
    product-entry responsibilities and must remain observable to YokoAgent.
    '''
    if not callable(app):
        raise TypeError('app must be an ASGI callable')
    if not isinstance(settings, ControlHostServerSettings):
        raise TypeError('settings must be ControlHostServerSettings')
    factory = create_uvicorn_server if server_factory is None else server_factory
    if not callable(factory):
        raise TypeError('server_factory must be callable')
    server = factory(app, settings)
    run = getattr(server, 'run', None)
    if not callable(run):
        raise TypeError('server_factory must return a server with run()')
    run()

__all__ = [
    'ControlHostServerBackend',
    'ControlHostServerFactory',
    'ControlHostServerSettings',
    'create_uvicorn_server',
    'serve_control_host']
