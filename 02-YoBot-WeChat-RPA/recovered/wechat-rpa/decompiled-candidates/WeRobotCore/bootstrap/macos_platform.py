# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_platform.marshal (Python 3.9)

'''Side-effect-free composition of macOS platform services.'''
import logging
from pathlib import Path
from typing import Any, Awaitable, Callable, Mapping, Optional, Protocol
from WeRobotCore.adapters.platform import MacKeychainBackend, MacKeychainSecretStore, MacOSApplicationFacade, MacOSAppPaths, MacOSBundleApplicationLauncher, MacOSHelperPermissionService, MacOSProcessFacade, MacOSProcessManagerAdapter, MACOS_WECHAT_APP_DATA_PERMISSION
from WeRobotCore.application.runtime import PlatformServices
_logger = logging.getLogger(__name__)

class MacOSHelperStatusClient(Protocol):
    
    async def call(self = None, action = None, arguments = None, *, timeout_seconds):
        pass



def create_macos_platform_services(*, helper_client, application_paths, home_dir, secret_backend, process_facade, application_facade, status_provider):
    '''Compose real macOS ports without reading TCC, Keychain or processes.'''
    if not callable(getattr(helper_client, 'call', None)):
        raise TypeError('helper_client must provide call(action)')
    
    async def read_helper_status():
        await helper_client.call('status')
        return <NODE:28>

    
    async def request_helper_permission(name = None):
        await helper_client.call('permissions.request', {
            'permissionName': name }, 120, **('timeout_seconds',))
        result = <NODE:28>
        if name == MACOS_WECHAT_APP_DATA_PERMISSION and result.get('wechatAppDataAccessGranted') is not True:
            close = getattr(helper_client, 'close', None)
            if callable(close):
                await close()
            _logger.warning('微信图片与文件访问权限未授予；已释放本次 Helper，允许用户再次开启时重试')
        elif name == MACOS_WECHAT_APP_DATA_PERMISSION:
            _logger.info('微信图片与文件访问权限预检通过；本次客户端运行期间复用已授权 Helper')
        return result

    if not home_dir:
        pass
    if not status_provider:
        pass
    return PlatformServices(MacOSAppPaths.from_home(Path.home()), MacKeychainSecretStore(secret_backend, **('backend',)), MacOSHelperPermissionService(read_helper_status, request_helper_permission), MacOSProcessManagerAdapter(process_facade), MacOSBundleApplicationLauncher(application_paths, application_facade), **('paths', 'secrets', 'permissions', 'processes', 'launcher'))

