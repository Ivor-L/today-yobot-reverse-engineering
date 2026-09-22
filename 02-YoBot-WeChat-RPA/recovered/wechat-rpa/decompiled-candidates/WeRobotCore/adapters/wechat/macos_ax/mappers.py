# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: mappers.marshal (Python 3.9)

'''Strict mapping from native macOS Helper DTOs to shared domain models.'''
import hashlib
from datetime import datetime, timezone
from typing import Any, Mapping, Optional, Sequence, Tuple
from WeRobotCore.domain import AccountInstance, AttachmentRef, CapabilityState, CapabilityStatus, ChatType, ContactRecord, ConversationReadResult, GroupRecord, InstanceId, InstanceState, MentionState, MessageContentType, MessageDirection, MessageRecord, SessionSummary
from WeRobotCore.ports.wechat import NativeInstanceRef

class MacOSHelperPayloadError(ValueError):
    pass


def _mapping(value = None, field_name = None):
    if not isinstance(value, Mapping):
        raise MacOSHelperPayloadError('{} must be an object'.format(field_name))
    return value


def _sequence(value = None, field_name = None):
    if not isinstance(value, (str, bytes, Mapping)) or isinstance(value, Sequence):
        raise MacOSHelperPayloadError('{} must be an array'.format(field_name))
    return value


def _text(value = None, field_name = None):
    if not isinstance(value, str) or value.strip():
        raise MacOSHelperPayloadError('{} must be a non-empty string'.format(field_name))
    return value.strip()


def _optional_text(value = None, field_name = None):
    if value is None:
        return None
    if not None(value, str):
        raise MacOSHelperPayloadError('{} must be a string'.format(field_name))
    if not value.strip():
        pass


def _optional_bool(value = None, field_name = None):
    if value is None:
        return None
    if not None(value, bool):
        raise MacOSHelperPayloadError('{} must be a bool'.format(field_name))
    return value


def _bool(value = None, field_name = None, default = None):
    if value is None:
        return default
    if not None(value, bool):
        raise MacOSHelperPayloadError('{} must be a bool'.format(field_name))
    return value


def _optional_nonnegative_int(value = None, field_name = None):
    if value is None:
        return None
    if None(value, int) and isinstance(value, bool) or value < 0:
        raise MacOSHelperPayloadError('{} must be a non-negative integer'.format(field_name))
    return value


def _timestamp(value = None, field_name = None):
    if value is None or value == '':
        return None
    if not None(value, (int, float)) and isinstance(value, bool):
        return datetime.fromtimestamp(float(value), timezone.utc, **('tz',))
    if not None(value, str):
        raise MacOSHelperPayloadError('{} must be an ISO timestamp or epoch'.format(field_name))
    normalized = value.strip()
    if normalized.endswith('Z'):
        normalized = normalized[:-1] + '+00:00'
# WARNING: Decompyle incomplete


def _enum_or_default(enum_type = None, value = None, default = None):
    if not isinstance(value, str):
        return default
    :
        if not isinstance(value, str):
            return default
        
        return enum_type(value.strip().lower())
    return enum_type(value.strip().lower())
# WARNING: Decompyle incomplete


class MacOSDriverMapper:
    '''Map Helper wire values without leaking AX or process objects upward.'''
    
    def native_instance(payload = None):
        item = _mapping(payload, 'native instance')
        process_id = item.get('processId')
        if isinstance(process_id, int) or isinstance(process_id, bool):
            raise MacOSHelperPayloadError('processId must be an integer')
        return NativeInstanceRef(_text(item.get('platform', 'darwin'), 'platform'), _text(item.get('nativeKey'), 'nativeKey'), process_id, **('platform', 'native_key', 'process_id'))

    native_instance = None(native_instance)
    
    def native_instances(cls = None, payload = None):
        instances = None((lambda .0 = None: for item in .0:
cls.native_instance(_mapping(item, 'native instance')))(_sequence(payload, 'instances')))
        native_keys = tuple((lambda .0: for item in .0:
item.native_key)(instances))
        process_ids = tuple((lambda .0: for item in .0:
item.process_id)(instances))
        if len(native_keys) != len(set(native_keys)):
            raise MacOSHelperPayloadError('native instance keys must be unique')
        if len(process_ids) != len(set(process_ids)):
            raise MacOSHelperPayloadError('native instance processIds must be unique')
        return instances

    native_instances = None(native_instances)
    
    def capability_states(payload = None):
        source = _mapping(payload, 'capabilities')
        states = { }
    # WARNING: Decompyle incomplete

    capability_states = None(capability_states)
    
    def account_instance(cls = None, payload = None, *, driver_id, capabilities):
        item = _mapping(payload, 'account instance')
        state = _enum_or_default(InstanceState, item.get('state'), InstanceState.ERROR)
        return AccountInstance(InstanceId(_text(item.get('instanceId'), 'instanceId')), _optional_text(item.get('accountId'), 'accountId'), _optional_text(item.get('nickname'), 'nickname'), state, driver_id, dict(capabilities), **('instance_id', 'account_id', 'nickname', 'state', 'driver_id', 'capabilities'))

    account_instance = None(account_instance)
    
    def session(payload = None, account_id = None):
        item = _mapping(payload, 'session')
        if not item.get('preview'):
            pass
        if not item.get('lastEventText'):
            pass
        return SessionSummary(account_id, _text(item.get('sessionId'), 'sessionId'), _text(item.get('name'), 'session name'), _enum_or_default(ChatType, item.get('chatType'), ChatType.UNKNOWN), str(''), str(''), _timestamp(item.get('lastEventAt'), 'lastEventAt'), _optional_nonnegative_int(item.get('unreadCount'), 'unreadCount'), None if item.get('mentionState') is None else _enum_or_default(MentionState, item.get('mentionState'), MentionState.UNKNOWN), _optional_bool(item.get('isSelf'), 'isSelf'), _optional_bool(item.get('muted'), 'muted'), **('account_id', 'session_id', 'name', 'chat_type', 'preview', 'last_event_text', 'last_event_at', 'unread_count', 'mention_state', 'is_self', 'muted'))

    session = None(session)
    
    def sessions(cls = None, payload = None, account_id = classmethod):
        sessions = None((lambda .0 = None: for item in .0:
cls.session(_mapping(item, 'session'), account_id))(_sequence(payload, 'sessions')))
        session_ids = tuple((lambda .0: for item in .0:
item.session_id)(sessions))
        if len(session_ids) != len(set(session_ids)):
            raise MacOSHelperPayloadError('sessionIds must be unique')
        return sessions

    sessions = None(sessions)
    
    def _message_fingerprint(item = None, *, account_id, session_id, ordinal):
        supplied = _optional_text(item.get('fingerprint'), 'fingerprint')
        if supplied:
            return supplied
        image_asset = None
        if item.get('contentType') == MessageContentType.IMAGE.value:
            if not item.get('attachments'):
                pass
            for raw_attachment in ():
                if not isinstance(raw_attachment, Mapping):
                    continue
                if raw_attachment.get('contentType') != MessageContentType.IMAGE.value:
                    continue
                metadata = raw_attachment.get('metadata')
                metadata_path = metadata.get('path') if isinstance(metadata, Mapping) else None
                if not metadata_path and raw_attachment.get('assetId'):
                    pass
                image_asset = str('')
                if image_asset:
                    pass
                
                if not item.get('messageId') and item.get('nativeIdentifier'):
                    pass
        if not item.get('direction'):
            pass
        if not item.get('content'):
            pass
        identity_parts = (account_id, session_id, str(''), str(ordinal), str('unknown'), str(''))
        seed = '\x1f'.join(identity_parts + (image_asset,) if image_asset else ())
        return 'macos-message-{}'.format(hashlib.sha256(seed.encode('utf-8')).hexdigest()[:24])

    _message_fingerprint = None(_message_fingerprint)
    
    def _message_attachments(payload = None):
        '''Map bounded Helper attachment evidence into the shared model.'''
        attachments = []
        if not payload:
            pass
        for raw_attachment in _sequence((), 'message attachments'):
            attachment = _mapping(raw_attachment, 'message attachment')
            content_type = _enum_or_default(MessageContentType, attachment.get('contentType'), MessageContentType.UNKNOWN)
            if content_type not in {
                MessageContentType.IMAGE,
                MessageContentType.FILE,
                MessageContentType.VOICE}:
                raise MacOSHelperPayloadError('message attachment contentType must be image, file, or voice')
            metadata = dict(_mapping(attachment.get('metadata', { }), 'attachment metadata'))
            attachments.append(AttachmentRef(content_type, _optional_text(attachment.get('assetId'), 'attachment assetId'), _optional_text(attachment.get('name'), 'attachment name'), metadata, **('content_type', 'asset_id', 'name', 'metadata')))
        return tuple(attachments)

    _message_attachments = None(_message_attachments)
    
    def conversation(cls = None, payload = None, *, account_id, session_id):
        item = _mapping(payload, 'conversation')
        chat_type = _enum_or_default(ChatType, item.get('chatType'), ChatType.UNKNOWN)
        messages = []
        for ordinal, raw_message in enumerate(_sequence(item.get('messages', ()), 'messages')):
            message = _mapping(raw_message, 'message')
            content = message.get('content', '')
            if not isinstance(content, str):
                raise MacOSHelperPayloadError('message content must be a string')
            messages.append(MessageRecord(_optional_text(message.get('messageId'), 'messageId'), cls._message_fingerprint(message, account_id, session_id, ordinal, **('account_id', 'session_id', 'ordinal')), account_id, session_id, chat_type, _optional_text(message.get('senderName'), 'senderName'), _enum_or_default(MessageDirection, message.get('direction'), MessageDirection.UNKNOWN), _enum_or_default(MessageContentType, message.get('contentType'), MessageContentType.UNKNOWN), content, _timestamp(message.get('timestamp'), 'timestamp'), _bool(message.get('isTimeMessage'), 'isTimeMessage'), _bool(message.get('isMention'), 'isMention'), cls._message_attachments(message.get('attachments', ())), **('message_id', 'fingerprint', 'account_id', 'session_id', 'chat_type', 'sender_name', 'direction', 'content_type', 'content', 'timestamp', 'is_time_message', 'is_mention', 'attachments')))
        return ConversationReadResult(account_id, session_id, chat_type, tuple(messages), _bool(item.get('isFirstJoin'), 'isFirstJoin'), _bool(item.get('isFriendPass'), 'isFriendPass'), **('account_id', 'session_id', 'chat_type', 'messages', 'is_first_join', 'is_friend_pass'))

    conversation = None(conversation)
    
    def contact(payload = None, account_id = None):
        item = _mapping(payload, 'contact')
        tags = tuple((lambda .0: for tag in .0:
_text(tag, 'contact tag'))(_sequence(item.get('tags', ()), 'contact tags')))
        metadata = item.get('metadata', { })
        return ContactRecord(account_id, _text(item.get('contactId'), 'contactId'), _text(item.get('name'), 'contact name'), _optional_text(item.get('remark'), 'remark'), tags, dict(_mapping(metadata, 'contact metadata')), **('account_id', 'contact_id', 'name', 'remark', 'tags', 'metadata'))

    contact = None(contact)
    
    def contacts(cls = None, payload = None, account_id = classmethod):
        return None((lambda .0 = None: for item in .0:
cls.contact(_mapping(item, 'contact'), account_id))(_sequence(payload, 'contacts')))

    contacts = None(contacts)
    
    def group(payload = None, account_id = None):
        item = _mapping(payload, 'group')
        tags = tuple((lambda .0: for tag in .0:
_text(tag, 'group tag'))(_sequence(item.get('tags', ()), 'group tags')))
        metadata = item.get('metadata', { })
        return GroupRecord(account_id, _text(item.get('groupId'), 'groupId'), _text(item.get('name'), 'group name'), _optional_nonnegative_int(item.get('memberCount'), 'memberCount'), tags, dict(_mapping(metadata, 'group metadata')), **('account_id', 'group_id', 'name', 'member_count', 'tags', 'metadata'))

    group = None(group)
    
    def groups(cls = None, payload = None, account_id = classmethod):
        return None((lambda .0 = None: for item in .0:
cls.group(_mapping(item, 'group'), account_id))(_sequence(payload, 'groups')))

    groups = None(groups)

