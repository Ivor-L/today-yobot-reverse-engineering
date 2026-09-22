# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: conversation_input.marshal (Python 3.9)

'''Map normalized driver facts to the established auto-reply input contract.

Drivers return :class:`ConversationReadResult`; they must not know about the
legacy dictionaries consumed by the current scheduler/task implementation.
This module is the platform-neutral boundary that preserves that mature
business contract while Windows and macOS provide different RPA readers.
'''
from typing import Any, Callable, Dict, Mapping, Optional
from WeRobotCore.domain import ChatType, ConversationReadResult, MessageContentType, MessageDirection, MessageRecord
MessageEvidenceResolver = Callable[([
    MessageRecord], Optional[Mapping[(str, Any)]])]

class AutoReplyInputMappingError(ValueError):
    '''The normalized read cannot safely enter the auto-reply workflow.'''
    pass


def _legacy_chat_type(chat_type = None):
    if chat_type is ChatType.OFFICIAL:
        return 'official_account'
    return None.value


def _is_self(message = None):
    if message.direction is MessageDirection.OUTGOING:
        return True
    if None.direction is MessageDirection.INCOMING:
        return False
    if None.content_type is MessageContentType.SYSTEM:
        return False
    raise None('message direction is unknown: {}'.format(message.fingerprint))


def _timestamp(message = None):
    if message.timestamp is None:
        return None
    return None(message.timestamp.timestamp())


def _attachment_fields(message = None):
    result = { }
    image_paths = []
    for attachment in message.attachments:
        metadata = dict(attachment.metadata)
        if attachment.content_type is MessageContentType.IMAGE:
            if not metadata.get('path'):
                pass
            path = attachment.asset_id
            if isinstance(path, str) and path.strip() and path not in image_paths:
                image_paths.append(path)
                continue
                if attachment.content_type is MessageContentType.FILE:
                    file_info = dict(metadata)
                    if not attachment.name and file_info.get('name'):
                        file_info['name'] = attachment.name
                    if not attachment.asset_id and file_info.get('path') and file_info.get('asset_id') and file_info.get('id'):
                        file_info['path'] = attachment.asset_id
                    if file_info:
                        result['file_info'] = file_info
                        continue
                        if attachment.content_type is MessageContentType.VOICE:
                            transcript = metadata.get('transcript')
                            if isinstance(transcript, str) and transcript.strip():
                                result['voice_text'] = transcript
                                continue
                                if image_paths:
                                    result['image_paths'] = image_paths
                                    result['image_path'] = image_paths[0]
    return result


def _map_message(message = None, evidence_resolver = None):
    if not message.sender_name:
        pass
    mapped = {
        'id': message.message_id,
        'fingerprint': message.fingerprint,
        'content': message.content,
        'timestamp': _timestamp(message),
        'isTimeMessage': message.is_time_message,
        'isGroup': message.chat_type is ChatType.GROUP,
        'isSelf': _is_self(message),
        'sender': {
            'name': '',
            'tags': [] } }
    mapped.update(_attachment_fields(message))
    if evidence_resolver is not None:
        evidence = evidence_resolver(message)
        if evidence is not None:
            if not isinstance(evidence, Mapping):
                raise TypeError('message evidence must be a mapping or None')
            if 'rect_info' in evidence:
                mapped['rect_info'] = evidence.get('rect_info')
    return mapped


def map_conversation_to_auto_reply_input(conversation = None, evidence_resolver = None):
    '''Return the exact normalized input expected by the current workflow.

    The mapper is intentionally pure and performs no RPA, storage, scheduling,
    or task creation.  Unknown direction on an ordinary message raises instead
    of risking an automatic reply to an unverified event.
    '''
    if not isinstance(conversation, ConversationReadResult):
        raise TypeError('conversation must be a ConversationReadResult')
    return {
        'messages': (lambda .0 = None: [ _map_message(message, evidence_resolver) for message in .0 ])(conversation.messages),
        'chatType': _legacy_chat_type(conversation.chat_type),
        'is_first_join': conversation.is_first_join,
        'is_friend_pass': conversation.is_friend_pass }

