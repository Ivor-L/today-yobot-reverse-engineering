# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: container.marshal (Python 3.9)

'''Composition container for one platform-specific YokoWebot runtime.'''
from dataclasses import dataclass
from WeRobotCore.ports import AppPaths, ApplicationLauncher, ContactProvider, ConversationReader, InstanceRegistry, MessageSender, PermissionService, ProcessManager, SecretStore
RuntimeDescriptor = dataclass(True, **('frozen',))(<NODE:12>)
PlatformServices = dataclass(True, **('frozen',))(<NODE:12>)
RuntimeContainer = dataclass(True, **('frozen',))(<NODE:12>)
