# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: fake.marshal (Python 3.9)

'''Pure in-memory composition root used before platform adapters take over.'''
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from WeRobotCore.adapters.platform import FakeApplicationLauncher, FakeAppPaths, FakeProcessManager, InMemorySecretStore, StaticPermissionService
from WeRobotCore.adapters.wechat import FakeWeChatDriver
from WeRobotCore.application.runtime import PlatformServices, RuntimeContainer, RuntimeDescriptor
FakeRuntimeBundle = dataclass(True, **('frozen',))(<NODE:12>)

def create_fake_runtime(driver = None, root = None, granted_permissions = None):
    '''Compose every initial Port without importing a native automation stack.'''
    secrets = InMemorySecretStore()
    permissions = StaticPermissionService(granted_permissions)
    process_ids = (driver.native_ref.process_id,) if driver.native_ref.process_id is not None else ()
    processes = FakeProcessManager(process_ids)
    launcher = FakeApplicationLauncher()
    runtime = RuntimeContainer(RuntimeDescriptor('fake', 'fake.memory.v1', **('platform', 'driver_id')), driver, driver, driver, driver, PlatformServices(FakeAppPaths(root, **('root',)), secrets, permissions, processes, launcher, **('paths', 'secrets', 'permissions', 'processes', 'launcher')), **('descriptor', 'instances', 'conversations', 'messages', 'contacts', 'platform_services'))
    runtime.validate()
    return FakeRuntimeBundle(runtime, driver, secrets, permissions, processes, launcher, **('runtime', 'driver', 'secrets', 'permissions', 'processes', 'launcher'))

