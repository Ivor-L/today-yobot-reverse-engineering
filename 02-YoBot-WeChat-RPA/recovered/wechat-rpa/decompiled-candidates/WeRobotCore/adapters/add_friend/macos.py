# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS native adapter for the shared automatic friend-add workflow.'''
from __future__ import annotations
from typing import Mapping, Sequence
from WeRobotCore.adapters.wechat.macos_ax import MacOSAxDriver
from WeRobotCore.application.add_friend import AddFriendRuntime
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.domain import AutomationError
from WeRobotCore.adapters.wechat.macos_ax.ipc import MacOSHelperCallError

class MacOSAddFriendRuntime(AddFriendRuntime):
    '''Map account identity to one bounded Helper friend-add operation.'''
    
    def __init__(self = None, *, gateway, driver):
        if not isinstance(gateway, WeChatAutomationGateway):
            raise TypeError('gateway must be WeChatAutomationGateway')
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be MacOSAxDriver')
        self._gateway = gateway
        self._driver = driver

    
    async def list_attached_account_ids(self = None):
        await self._gateway.runtime.instances.list_attached()
        instances = <NODE:28>
        return tuple((lambda .0: 