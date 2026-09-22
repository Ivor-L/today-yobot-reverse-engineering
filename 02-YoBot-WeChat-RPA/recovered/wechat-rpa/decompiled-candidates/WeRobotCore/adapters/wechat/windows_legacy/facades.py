# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: facades.marshal (Python 3.9)

"""Typed injectable surfaces of the mature Windows chat/contact layers.

The real module is supplied only by a Windows composition root.  Keeping these
Protocols free of imports preserves Mac/Linux testability and ensures the
Adapters continue to reuse Legacy's single-worker UIA executor and shared
contact database.
"""
from typing import Any, Optional, Protocol

class LegacyConversationFacade(Protocol):
    
    async def async_get_latest_sessions(self = None, limit = None, start_time = None, account_id = (20, None, None)):
        pass

    
    async def async_get_chat_messages(self, session_name, parse_file = None, context_count = None, save_msg = None, account_id = (False, 15, False, None, None), expected_anchor = {
        'session_name': str,
        'parse_file': bool,
        'context_count': int,
        'save_msg': bool,
        'account_id': Optional[str],
        'expected_anchor': Optional[str],
        'return': Any }):
        pass



class LegacyTextMessageFacade(Protocol):
    
    async def async_send_message(self = None, user = None, message = None, account_id = (None, None), quote_msg_id = {
        'user': str,
        'message': str,
        'account_id': Optional[str],
        'quote_msg_id': Optional[str],
        'return': Any }):
        pass



class LegacyChatFacade(Protocol, LegacyTextMessageFacade, LegacyConversationFacade):
    '''Combined type of the existing ``api.chat`` module at the binding seam.'''
    pass


class LegacyContactSnapshotFacade(Protocol):
    '''Read already-collected Legacy contact/group snapshots.

    The implementation is supplied by the Windows composition boundary.  It
    may reuse the current database-backed list routes, but it must not start a
    contact synchronization as an implicit side effect of these read methods.
    Synchronization, RPA exclusivity and persistence remain shared application
    concerns.
    '''
    
    async def async_list_contacts(self = None, account_id = None):
        pass

    
    async def async_list_groups(self = None, account_id = None):
        pass



class LegacyContactDatabase(Protocol):
    '''Existing shared contact database surface consumed by the binder.'''
    
    def get_friends(self = None, account_id = None):
        pass

    
    def get_groups(self = None, account_id = None):
        pass


