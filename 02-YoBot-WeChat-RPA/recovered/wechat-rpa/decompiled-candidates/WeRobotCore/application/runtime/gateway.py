# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: gateway.marshal (Python 3.9)

'''Account-scoped facade over fine-grained driver ports.'''
from dataclasses import dataclass
from typing import Optional, Sequence
from WeRobotCore.domain import AccountInstance, AutomationError, CapabilityName, CapabilityState, CapabilityStatus, ConversationReadResult, ContactRecord, ErrorCode, GroupRecord, OperationResult, SessionSummary
from WeRobotCore.ports import FavoriteMessageSender, GroupInviteJoiner, GroupMemberInviter, MessageForwarder
from container import RuntimeContainer
AutomationContext = dataclass(True, **('frozen',))(<NODE:12>)

class WeChatAutomationGateway:
    
    def __init__(self = None, runtime = None):
        runtime.validate()
        self._runtime = runtime

    
    def runtime(self = None):
        return self._runtime

    runtime = None(runtime)
    
    async def for_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'account_id must be a non-empty string')
        await self._runtime.instances.get_by_account(account_id)
        instance = <NODE:28>
        if instance is None:
            raise AutomationError(ErrorCode.ACCOUNT_NOT_INITIALIZED, 'account is not attached: {}'.format(account_id))
        return AutomationContext(instance, self._runtime, **('instance', 'runtime'))


