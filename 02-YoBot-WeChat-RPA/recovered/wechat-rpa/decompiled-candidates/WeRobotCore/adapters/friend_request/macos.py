# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS adapter for the shared automatic friend-request business flow.'''
from typing import Mapping, Sequence
from WeRobotCore.adapters.mass_sending import MacOSMassSendingRuntime
from WeRobotCore.adapters.wechat.macos_ax import MacOSAxDriver
from WeRobotCore.application.friend_request import FriendRequestRuntime
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.domain import CapabilityName, ChatType, OperationResult, SessionSummary

class MacOSFriendRequestRuntime(FriendRequestRuntime):
    '''Map account identity to one bounded native acceptance transaction.'''
    
    def __init__(self = None, *, gateway, driver, outbound_runtime):
        if not isinstance(gateway, WeChatAutomationGateway):
            raise TypeError('gateway must be WeChatAutomationGateway')
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be MacOSAxDriver')
        if not isinstance(outbound_runtime, MacOSMassSendingRuntime):
            raise TypeError('outbound_runtime must be MacOSMassSendingRuntime')
        self._gateway = gateway
        self._driver = driver
        self._outbound = outbound_runtime

    
    def message_sender(self):
        return self._outbound.message_sender

    message_sender = property(message_sender)
    
    def configuration_for(self = None, account_id = None):
        return self._outbound.configuration_for(account_id)

    
    async def list_attached_account_ids(self = None):
        await self._gateway.runtime.instances.list_attached()
        instances = <NODE:28>
        return tuple((lambda .0: 