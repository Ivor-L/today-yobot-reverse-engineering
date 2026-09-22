# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: group_mention_sender.marshal (Python 3.9)

'''Platform-neutral group-member mention transaction for auto reply.'''
from typing import Optional, Protocol, runtime_checkable
from WeRobotCore.domain import CapabilityName, ErrorCode, OperationResult
from WeRobotCore.ports.wechat import GroupMentionMessageSender
from conversation_reader import AutomationContextProvider
AutoReplyGroupMentionSender = runtime_checkable(<NODE:12>)

class AutomationContextAutoReplyGroupMentionSender:
    '''Resolve one account context and call its optional mention port.'''
    
    def __init__(self = None, contexts = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        self._contexts = contexts

    
    def _required(value = None, field_name = None):
        if not isinstance(value, str) or value.strip():
            raise ValueError('{} must be a non-empty string'.format(field_name))
        return value.strip()

    _required = None(_required)
    
    async def _target(self = None, account_id = None):
        account = self._required(account_id, 'account_id')
        await self._contexts.for_account(account)
        context = <NODE:28>
        capability = context.capability(CapabilityName.GROUP_MEMBER_MENTION_REPLY.value)
        if not capability.available:
            if not capability.reason_code:
                pass
            return (None, None, OperationResult.failed(ErrorCode.CAPABILITY_UNAVAILABLE, 'group mention reply is unavailable'))
        sender = None.runtime.messages
        if not isinstance(sender, GroupMentionMessageSender):
            return (None, None, OperationResult.failed(ErrorCode.CAPABILITY_UNAVAILABLE, 'the selected runtime has no group mention sender'))
        return (None, sender, None)

    
    async def prepare(self = None, account_id = None, session_id = None, message_id = {
        'account_id': str,
        'session_id': str,
        'message_id': str,
        'return': OperationResult }):
        session = self._required(session_id, 'session_id')
        message = self._required(message_id, 'message_id')
        await self._target(account_id)
        (context, sender, failure) = <NODE:28>
        if failure is not None:
            return failure
        await None.prepare_group_mention(context.instance.instance_id, session, message)
        return <NODE:28>

    
    async def clear(self = None, account_id = None, session_id = None, expected_draft = {
        'account_id': str,
        'session_id': str,
        'expected_draft': str,
        'return': OperationResult }):
        session = self._required(session_id, 'session_id')
        draft = self._required(expected_draft, 'expected_draft')
        await self._target(account_id)
        (context, sender, failure) = <NODE:28>
        if failure is not None:
            return failure
        await None.clear_prepared_group_mention(context.instance.instance_id, session, draft)
        return <NODE:28>

    
    async def send_text(self, account_id = None, session_id = None, content = None, expected_draft = (None,), quote_message_id = {
        'account_id': str,
        'session_id': str,
        'content': str,
        'expected_draft': str,
        'quote_message_id': Optional[str],
        'return': OperationResult }):
        session = self._required(session_id, 'session_id')
        draft = self._required(expected_draft, 'expected_draft')
        if not isinstance(content, str):
            raise TypeError('content must be a string')
        await self._target(account_id)
        (context, sender, failure) = <NODE:28>
        if failure is not None:
            return failure
        await None.send_prepared_group_mention_text(context.instance.instance_id, session, content, draft, quote_message_id, **('quote_message_id',))
        return <NODE:28>

    
    async def send_image(self, account_id = None, session_id = None, asset_id = None, expected_draft = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'expected_draft': str,
        'return': OperationResult }):
        await self._send_media('image', account_id, session_id, asset_id, expected_draft)
        return <NODE:28>

    
    async def send_file(self, account_id = None, session_id = None, asset_id = None, expected_draft = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'expected_draft': str,
        'return': OperationResult }):
        await self._send_media('file', account_id, session_id, asset_id, expected_draft)
        return <NODE:28>

    
    async def _send_media(self, media_kind, account_id = None, session_id = None, asset_id = None, expected_draft = {
        'media_kind': str,
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'expected_draft': str,
        'return': OperationResult }):
        session = self._required(session_id, 'session_id')
        asset = self._required(asset_id, 'asset_id')
        draft = self._required(expected_draft, 'expected_draft')
        await self._target(account_id)
        (context, sender, failure) = <NODE:28>
        if failure is not None:
            return failure
        method = sender.send_prepared_group_mention_image if None == 'image' else sender.send_prepared_group_mention_file
        await method(context.instance.instance_id, session, asset, draft)
        return <NODE:28>


__all__ = [
    'AutoReplyGroupMentionSender',
    'AutomationContextAutoReplyGroupMentionSender']
