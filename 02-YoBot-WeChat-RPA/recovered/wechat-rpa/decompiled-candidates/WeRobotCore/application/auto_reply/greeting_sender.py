# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: greeting_sender.marshal (Python 3.9)

'''Platform-neutral delivery port for configured greeting sequences.'''
from typing import Protocol, runtime_checkable
from WeRobotCore.domain import OperationResult
from conversation_reader import AutomationContextProvider
GreetingMessageSender = runtime_checkable(<NODE:12>)
FavoriteGreetingMessageSender = runtime_checkable(<NODE:12>)

class AutomationContextGreetingMessageSender:
    '''Resolve an account Context and reuse the verified Driver send ports.'''
    
    def __init__(self = None, contexts = None):
        if not contexts is None or isinstance(contexts, AutomationContextProvider):
            raise TypeError('contexts must implement AutomationContextProvider')
        self._contexts = contexts

    
    def _required(value = None, field_name = None):
        if not isinstance(value, str) or value.strip():
            raise ValueError('{} must be a non-empty string'.format(field_name))
        return value.strip()

    _required = None(_required)
    
    async def send_text(self = None, account_id = None, session_id = None, content = {
        'account_id': str,
        'session_id': str,
        'content': str,
        'return': OperationResult }):
        account = self._required(account_id, 'account_id')
        session = self._required(session_id, 'session_id')
        if not isinstance(content, str) or content.strip():
            raise ValueError('content must be non-empty text')
        await self._contexts.for_account(account)
        context = <NODE:28>
        await context.send_text(session, content)
        result = <NODE:28>
        if not isinstance(result, OperationResult):
            raise TypeError('AutomationContext.send_text must return OperationResult')
        return result

    
    async def send_image(self = None, account_id = None, session_id = None, asset_id = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'return': OperationResult }):
        await self._send_media('image', account_id, session_id, asset_id)
        return <NODE:28>

    
    async def send_file(self = None, account_id = None, session_id = None, asset_id = {
        'account_id': str,
        'session_id': str,
        'asset_id': str,
        'return': OperationResult }):
        await self._send_media('file', account_id, session_id, asset_id)
        return <NODE:28>

    
    async def send_favorite(self = None, account_id = None, session_id = None, keyword = {
        'account_id': str,
        'session_id': str,
        'keyword': str,
        'return': OperationResult }):
        account = self._required(account_id, 'account_id')
        session = self._required(session_id, 'session_id')
        normalized_keyword = self._required(keyword, 'keyword')
        await self._contexts.for_account(account)
        context = <NODE:28>
        await context.send_favorite(session, normalized_keyword)
        result = <NODE:28>
        if not isinstance(result, OperationResult):
            raise TypeError('AutomationContext.send_favorite must return OperationResult')
        return result

    
    async def _send_media(self, media_kind = None, account_id = None, session_id = None, asset_id = {
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
        result = <NODE:28> if media_kind == 'image' else <NODE:28>
        if not isinstance(result, OperationResult):
            raise TypeError('AutomationContext.send_{} must return OperationResult'.format(media_kind))
        return result


__all__ = [
    'FavoriteGreetingMessageSender',
    'GreetingMessageSender',
    'AutomationContextGreetingMessageSender']
