# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: media_sender.marshal (Python 3.9)

'''Context-backed image and file delivery for the shared auto-reply workflow.'''
from typing import Protocol, runtime_checkable
from WeRobotCore.domain import OperationResult
from conversation_reader import AutomationContextProvider
AutoReplyMediaSender = runtime_checkable(<NODE:12>)

class AutomationContextAutoReplyMediaSender:
    '''Resolve the account Context and delegate media writes to its Driver.'''
    
    def __init__(self = None, contexts = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        self._contexts = contexts

    
    def _required(value = None, field_name = None):
        if not isinstance(value, str) or value.strip():
            raise ValueError('{} must be a non-empty string'.format(field_name))
        return value.strip()

    _required = None(_required)
    
    async def send_image(self = None, account_id = None, session_id = None, asset_id = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'return': OperationResult }):
        await self._send('image', account_id, session_id, asset_id)
        return <NODE:28>

    
    async def send_file(self = None, account_id = None, session_id = None, asset_id = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'return': OperationResult }):
        await self._send('file', account_id, session_id, asset_id)
        return <NODE:28>

    
    async def _send(self, media_kind = None, account_id = None, session_id = None, asset_id = {
        'media_kind': str,
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'return': OperationResult }):
        account = self._required(account_id, 'account_id')
        session = self._required(session_id, 'session_id')
        asset = self._required(asset_id, 'asset_id')
        await self._contexts.for_account(account)
        context = <NODE:28>
        if media_kind == 'image':
            await context.send_image(session, asset)
            result = <NODE:28>
        else:
            await context.send_file(session, asset)
            result = <NODE:28>
        if not isinstance(result, OperationResult):
            raise TypeError('AutomationContext.send_{} must return OperationResult'.format(media_kind))
        return result


__all__ = [
    'AutoReplyMediaSender',
    'AutomationContextAutoReplyMediaSender']
