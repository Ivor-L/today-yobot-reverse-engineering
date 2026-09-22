# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos.marshal (Python 3.9)

'''macOS recipient resolver for the shared mass-sending flow.'''
from typing import Sequence
from WeRobotCore.adapters.contact_storage import ExplicitPathContactStore
from WeRobotCore.adapters.wechat.macos_ax import MacOSAxDriver
from WeRobotCore.application.auto_reply.greeting_sender import GreetingMessageSender
from WeRobotCore.application.mass_sending import MassSendingRuntime
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.domain import CapabilityName, ChatType, InstanceState, SessionSummary

class MacOSMassSendingRuntime(MassSendingRuntime):
    '''Bridge stable Windows business semantics to the macOS AX Driver.'''
    
    def __init__(self = None, *, gateway, driver, contact_store, configuration_factory, message_sender):
        if not isinstance(gateway, WeChatAutomationGateway):
            raise TypeError('gateway must be WeChatAutomationGateway')
        if not isinstance(driver, MacOSAxDriver):
            raise TypeError('driver must be MacOSAxDriver')
        if not isinstance(contact_store, ExplicitPathContactStore):
            raise TypeError('contact_store must be ExplicitPathContactStore')
        if not callable(configuration_factory):
            raise TypeError('configuration_factory must be callable')
        if not isinstance(message_sender, GreetingMessageSender):
            raise TypeError('message_sender must implement GreetingMessageSender')
        self._gateway = gateway
        self._driver = driver
        self._contact_store = contact_store
        self._configuration_factory = configuration_factory
        self._message_sender = message_sender

    
    def message_sender(self = None):
        return self._message_sender

    message_sender = None(message_sender)
    
    def configuration_for(self = None, account_id = None):
        return self._configuration_factory.for_account(account_id)

    
    async def resolve_targets(self = None, account_id = None, tag_ids = None, selected_names = {
        'account_id': str,
        'tag_ids': Sequence[str],
        'selected_names': Sequence[str],
        'return': Sequence[str] }):
        ordered = []
        seen = set()
        
        def add(raw_name = None):
            if not raw_name:
                pass
            name = str('').strip()
            if name and name not in seen:
                seen.add(name)
                ordered.append(name)

        for name in selected_names:
            add(name)
        if not ordered:
            for raw_tag in tag_ids:
                if not raw_tag:
                    pass
                tag = str('').strip()
                if not tag:
                    continue
                await self._contact_store.list_contacts(account_id, tag, **('tag',))
                for contact in <NODE:28>:
                    add(contact.get('name'))
        return tuple(ordered)

    
    async def resolve_conversation(self = None, account_id = None, target_name = None):
        if not target_name:
            pass
        name = str('').strip()
        if not name:
            raise ValueError('target_name must be non-empty text')
        expected_type = ChatType.GROUP if self._contact_store.is_group_chat(account_id, name) else ChatType.PRIVATE
        if expected_type is ChatType.PRIVATE:
            await self._contact_store.list_contacts(account_id, name, **('keyword',))
            exact_contacts = (lambda .0 = None: [ row for row in .0 if str('').strip() == name ])(<NODE:28>)
            if len(exact_contacts) != 1:
                raise ValueError('目标不在已同步的好友/群聊目录中: {}'.format(name))
        await self.resolve_conversation_as(account_id, name, expected_type)
        return <NODE:28>

    
    async def resolve_conversation_as(self = None, account_id = None, target_name = None, expected_type = None, *, required_capability):
        if expected_type not in (ChatType.PRIVATE, ChatType.GROUP):
            raise ValueError('expected_type must be private or group')
        await self._gateway.for_account(account_id)
        context = <NODE:28>
        await self._driver.resolve_conversation_by_name(context.instance.instance_id, target_name, expected_type, required_capability, **('required_capability',))
        return <NODE:28>

    
    async def is_account_online(self = None, account_id = None):
        pass
    # WARNING: Decompyle incomplete


__all__ = [
    'MacOSMassSendingRuntime']
