# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_launch.marshal (Python 3.9)

'''Pure launch contract for the still-default-off macOS Control Host.

This module translates the existing YokoAgent process contract into explicit
macOS product inputs.  It never reads ``os.environ`` or ``Path.home()`` by
itself, accesses Keychain, creates directories, opens a socket, or starts the
Control Host.  The future signed entry point must provide the argument vector,
environment snapshot and home directory explicitly.

The local ``X-API-Key`` is a legacy loopback compatibility credential shared
with the existing YokoAgent client.  It is deliberately kept separate from
``YOKO_RPA_TOKEN`` and other business secrets owned by ``SecretStore``.
'''
from __future__ import annotations
from dataclasses import dataclass, field
import os
from pathlib import Path
import re
from typing import Mapping, Optional, Sequence
from urllib.parse import urlsplit, urlunsplit
from WeRobotCore.adapters.platform.macos_native import MacOSAppPaths
from WeRobotCore.application.control_access import ControlAccessAuthorizer
from WeRobotCore.application.control_runtime_identity import ControlRuntimeIdentity
from WeRobotCore.bootstrap.macos_product_startup import MacOSProductStartupPublication
from control_app import FrontendDirectory
from macos_candidate import MacOSAutoReplyServiceFactory, MacOSControlHostCandidate, create_macos_control_host_candidate
from server import ControlHostServerSettings
MACOS_AGENT_DEFAULT_CHANNEL_ID = 'agent_generic'
MACOS_AGENT_DEFAULT_PORT = 9922
MACOS_LEGACY_LOCAL_API_KEY = 'yoko_test'
_MAX_CHANNEL_ID_LENGTH = 128
_RUNTIME_ID = re.compile('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.IGNORECASE)

def _nonempty_text(name = None, value = None):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(name))
    return value.strip()


def _optional_text(name = None, value = None):
    if value is None:
        return None
    return None(name, value)


def _optional_runtime_id(value = None):
    if value is None:
        return None
    runtime_id = None('YOKO_RPA_RUNTIME_ID', value)
    if _RUNTIME_ID.fullmatch(runtime_id) is None:
        raise ValueError('YOKO_RPA_RUNTIME_ID must be a UUID')
    return runtime_id


def _optional_remote_api_base(value = None, *, backend_mode):
    if value is None:
        return None
    api_base = None('YOKO_API_BASE', value).rstrip('/')
    if not backend_mode:
        return api_base
    parsed = None(api_base)
    if parsed.scheme not in ('http', 'https') and parsed.netloc and parsed.username is not None and parsed.password is not None and parsed.query or parsed.fragment:
        raise ValueError('YOKO_API_BASE must be an HTTP(S) origin or path in Agent plugin mode')
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path.rstrip('/'), '', ''))


def _parse_port(value = None):
    if isinstance(value, bool):
        raise ValueError('YOKO_RPA_PORT must be an integer between 1 and 65535')
# WARNING: Decompyle incomplete


def _parse_agent_arguments(arguments = None):
    if isinstance(arguments, (str, bytes)):
        raise TypeError('arguments must be a sequence of strings')
    backend_mode = False
    channel_id = None
    index = 0
    if index < len(arguments):
        argument = arguments[index]
        if not isinstance(argument, str):
            raise TypeError('arguments must contain only strings')
        if argument == '--no-ui':
            if backend_mode:
                raise ValueError('--no-ui may be provided only once')
            backend_mode = True
            index += 1
            continue
        if argument == '--channel-id':
            if channel_id is not None:
                raise ValueError('--channel-id may be provided only once')
            if index + 1 >= len(arguments):
                raise ValueError('--channel-id requires a value')
            channel_id = _nonempty_text('channel_id', arguments[index + 1])
            index += 2
            continue
        if argument.startswith('--channel-id='):
            if channel_id is not None:
                raise ValueError('--channel-id may be provided only once')
            channel_id = _nonempty_text('channel_id', argument.partition('=')[2])
            index += 1
            continue
        raise ValueError('unsupported macOS Control argument: {}'.format(argument))
    continue
    return (backend_mode, channel_id)


def _validate_channel_id(value = None):
    channel_id = _nonempty_text('channel_id', value)
    if len(channel_id) > _MAX_CHANNEL_ID_LENGTH:
        raise ValueError('channel_id exceeds the 128-character limit')
    if any((lambda .0: for character in .0:
if not ord(character) < 32:
passord(character) == 127)(channel_id)):
        raise ValueError('channel_id must not contain control characters')
    return channel_id

MacOSControlProcessCredentials = dataclass(True, **('frozen',))(<NODE:12>)
MacOSControlLaunchInputs = dataclass(True, **('frozen',))(<NODE:12>)
MacOSControlHostLaunchPlan = dataclass(True, **('frozen',))(<NODE:12>)

def resolve_macos_control_launch_inputs(*, arguments, environment, home_dir):
    '''Resolve the frozen Agent/Control contract from explicit snapshots.

    ``environment`` is intentionally supplied by the caller.  This function
    never consults or mutates the real process environment, so it is safe for
    packaging checks and deterministic tests.
    '''
    if not isinstance(environment, Mapping):
        raise TypeError('environment must be a mapping')
    if not isinstance(home_dir, Path):
        raise TypeError('home_dir must be a pathlib.Path')
    (backend_mode, argument_channel_id) = _parse_agent_arguments(arguments)
    if not environment.get('YOKO_CHANNEL_ID') and environment.get('VITE_CHANNEL_ID'):
        pass
    environment_channel_id = MACOS_AGENT_DEFAULT_CHANNEL_ID
    if not argument_channel_id:
        pass
    channel_id = _validate_channel_id(environment_channel_id)
    port = _parse_port(environment.get('YOKO_RPA_PORT', str(MACOS_AGENT_DEFAULT_PORT)))
    local_api_key = environment.get('WEBOT_API_KEY', MACOS_LEGACY_LOCAL_API_KEY)
    credentials = MacOSControlProcessCredentials(local_api_key, environment.get('YOKO_RPA_TOKEN'), **('local_api_key', 'rpa_token'))
    return MacOSControlLaunchInputs(backend_mode, channel_id, ControlHostServerSettings(port, **('port',)), MacOSAppPaths.from_home(home_dir), credentials, environment.get('YOKO_API_BASE'), environment.get('YOKO_RPA_RUNTIME_ID'), environment.get('YOKO_RPA_MACHINE_CODE'), environment.get('AGENT_SESSION_V2_MODE', 'disabled'), **('backend_mode', 'channel_id', 'server_settings', 'app_paths', 'credentials', 'remote_api_base', 'runtime_id', 'machine_code', 'session_v2_mode'))


def prepare_macos_control_host_launch(*, publication, inputs, access_authorizer, auto_reply_service_factory, frontend_directory, license_service):
    '''Compose the Host and frozen server settings without running either.'''
    if not isinstance(inputs, MacOSControlLaunchInputs):
        raise TypeError('inputs must be MacOSControlLaunchInputs')
    host = None(None, None, None, None, None, (lambda : ControlRuntimeIdentity(inputs.runtime_id, os.getpid(), inputs.channel_id, True, **('runtime_id', 'process_id', 'channel_id', 'backend_mode'))) if inputs.runtime_id is not None else None, frontend_directory, license_service, **('publication', 'api_key', 'access_authorizer', 'auto_reply_service_factory', 'backend_mode_provider', 'runtime_identity_provider', 'frontend_directory', 'license_service'))
    return MacOSControlHostLaunchPlan(host, inputs, **('host', 'inputs'))

__all__ = [
    'MACOS_AGENT_DEFAULT_CHANNEL_ID',
    'MACOS_AGENT_DEFAULT_PORT',
    'MACOS_LEGACY_LOCAL_API_KEY',
    'MacOSControlHostLaunchPlan',
    'MacOSControlLaunchInputs',
    'MacOSControlProcessCredentials',
    'prepare_macos_control_host_launch',
    'resolve_macos_control_launch_inputs']
