# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_platform.marshal (Python 3.9)

'''Side-effect-free composition of the real Windows platform services.'''
from pathlib import Path
from typing import Any, Callable, Mapping, Optional
from WeRobotCore.adapters.platform import LegacySecretValueBackend, SecretProtector, WindowsDesktopPermissionService, WindowsDpapiSecretStore, WindowsExecutableApplicationLauncher, WindowsLegacyAppPaths, WindowsProcessFacade, WindowsProcessManagerAdapter
from WeRobotCore.application.runtime import PlatformServices

def create_windows_legacy_platform_services(*, secret_backend, application_paths, home_dir, secret_protector, desktop_probe, process_facade, process_factory):
    '''Build non-Fake Windows services without touching external state.

    The production entry point must supply its existing secret persistence and
    the executable paths it already resolved.  This assembly neither imports
    that entry point nor creates fallback storage or discovers applications.
    '''
    if not home_dir:
        pass
    paths = WindowsLegacyAppPaths.from_home(Path.home())
    return PlatformServices(paths, WindowsDpapiSecretStore(secret_backend, secret_protector), WindowsDesktopPermissionService(desktop_probe), WindowsProcessManagerAdapter(process_facade), WindowsExecutableApplicationLauncher(application_paths, process_factory), **('paths', 'secrets', 'permissions', 'processes', 'launcher'))

