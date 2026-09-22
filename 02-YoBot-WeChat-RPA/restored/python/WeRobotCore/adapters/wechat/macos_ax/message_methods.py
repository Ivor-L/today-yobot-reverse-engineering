"""Recovered MacOSAxDriver.read_messages/send_text as a PARTIAL mixin.

This is not a standalone driver. Its host must supply the original capability
checks, instance attachment, operation locks, mapper and session indexes.
MacOSHelperPayloadError is supplied separately here until mappers is restored.
"""
from dataclasses import replace
from typing import Mapping
from WeRobotCore.domain import AutomationError, ErrorCode
from WeRobotCore.domain.models import ChatType, MessageDirection, OperationResult
from .ipc import MacOSHelperCallError


class MacOSHelperPayloadError(ValueError):
    """Compatibility declaration; original mapper implementation is still pending."""


class MacOSAxMessageMethods:
    async def read_messages(self, instance_id, session_id, limit=25,
                            parse_files=False, expected_anchor=None):
        self._require_capability('conversation.read')
        instance = self._attached_instance(instance_id)
        if not isinstance(session_id, str) or not session_id.strip():
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'session_id must be a non-empty string')
        normalized_session_id = session_id.strip()
        if isinstance(limit, bool) or not isinstance(limit, int) or not 1 <= limit <= 25:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'message limit must be an integer from 1 through 25')
        if not isinstance(parse_files, bool):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'parse_files must be a boolean')
        if expected_anchor is not None:
            if not isinstance(expected_anchor, str):
                raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'expected_anchor must be text or None')
            if len(expected_anchor) > 512:
                raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'expected_anchor cannot exceed 512 characters')
        indexed_session = self._session_index.get(instance_id, {}).get(normalized_session_id)
        if indexed_session is None:
            raise AutomationError(ErrorCode.ELEMENT_NOT_FOUND,
                                  'session is not indexed; list_sessions must run first: {}'.format(normalized_session_id))
        async with self._operation_lock(instance_id):
            arguments = dict(self._instance_arguments(instance_id))
            arguments.update({
                'sessionId': normalized_session_id, 'sessionName': indexed_session.name,
                'expectedChatType': indexed_session.chat_type.value, 'limit': limit,
                'parseFiles': parse_files, 'expectedAnchor': expected_anchor,
                'accountNickname': instance.nickname,
            })
            result = await self._helper.call('wechat.conversation.read', arguments,
                                             timeout_seconds=25.0 if parse_files else 12.0)
        raw_conversation = result.get('conversation')
        if not isinstance(raw_conversation, Mapping):
            raise AutomationError(ErrorCode.OPERATION_FAILED, 'macOS Helper returned no conversation object')
        if raw_conversation.get('sessionId') != normalized_session_id:
            raise AutomationError(ErrorCode.CONVERSATION_CHANGED, 'macOS Helper returned another conversation sessionId')
        if raw_conversation.get('sessionName') != indexed_session.name:
            raise AutomationError(ErrorCode.CONVERSATION_CHANGED, 'macOS Helper returned another conversation name')
        if expected_anchor and raw_conversation.get('expectedAnchorMatched') is not True:
            raise AutomationError(ErrorCode.CONVERSATION_CHANGED, 'macOS Helper did not verify the expected message anchor')
        try:
            conversation = self._mapper.conversation(raw_conversation,
                account_id=instance.account_id or str(instance_id), session_id=normalized_session_id)
        except MacOSHelperPayloadError as exc:
            raise AutomationError(ErrorCode.OPERATION_FAILED, str(exc)) from exc
        if conversation.chat_type is ChatType.UNKNOWN:
            raise AutomationError(ErrorCode.ACTION_NOT_VERIFIED, 'macOS visible conversation type was not resolved')
        if indexed_session.chat_type is not ChatType.UNKNOWN and conversation.chat_type is not indexed_session.chat_type:
            raise AutomationError(ErrorCode.CONVERSATION_CHANGED, 'macOS visible conversation type changed after session polling')
        self._verified_incoming_messages[(instance_id, normalized_session_id)] = {
            message.message_id for message in conversation.messages
            if message.direction is MessageDirection.INCOMING
            and isinstance(message.message_id, str) and message.message_id
        }
        if conversation.chat_type is ChatType.GROUP:
            self._confirmed_group_session_ids.add(normalized_session_id)
        self._session_index[instance_id][normalized_session_id] = replace(indexed_session, chat_type=conversation.chat_type)
        return conversation

    async def send_text(self, instance_id, session_id, content, quote_message_id=None):
        failure = self._write_capability_failure('message.send_text')
        if failure is not None:
            return failure
        try:
            self._attached_instance(instance_id)
            if not isinstance(session_id, str) or not session_id.strip():
                raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'session_id must be a non-empty string')
            if not isinstance(content, str) or not content.strip():
                raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'text content must be non-empty')
            if len(content) > 512:
                raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'text content cannot exceed 512 characters')
            normalized_quote_id = None
            if quote_message_id is not None:
                if not isinstance(quote_message_id, str) or not quote_message_id.strip():
                    raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'quote_message_id must be non-empty text or None')
                normalized_quote_id = quote_message_id.strip()
            normalized_session_id = session_id.strip()
            indexed_session = self._session_index.get(instance_id, {}).get(normalized_session_id)
            if indexed_session is None:
                raise AutomationError(ErrorCode.ELEMENT_NOT_FOUND,
                                      'session is not indexed; list_sessions must run first: {}'.format(normalized_session_id))
            if indexed_session.chat_type is ChatType.UNKNOWN:
                raise AutomationError(ErrorCode.ACTION_NOT_VERIFIED, 'conversation type must be resolved before text delivery')
            if normalized_quote_id is not None:
                verified = self._verified_incoming_messages.get((instance_id, normalized_session_id), set())
                if normalized_quote_id not in verified:
                    raise AutomationError(ErrorCode.ACTION_NOT_VERIFIED, 'quote target was not verified as incoming by the last read')
            async with self._operation_lock(instance_id):
                arguments = dict(self._instance_arguments(instance_id))
                arguments.update({
                    'sessionId': normalized_session_id, 'sessionName': indexed_session.name,
                    'expectedChatType': indexed_session.chat_type.value,
                    'content': content, 'quoteMessageId': normalized_quote_id,
                })
                result = await self._helper.call('wechat.message.send_text', arguments, timeout_seconds=20.0)
        except (AutomationError, MacOSHelperCallError) as exc:
            return OperationResult.failed(exc.code, str(exc), retryable=False,
                data={'helperCode': getattr(exc, 'helper_code', None), 'attemptCount': 1})
        receipt = result.get('receipt')
        if not isinstance(receipt, Mapping):
            return OperationResult.failed(ErrorCode.OPERATION_FAILED,
                'macOS Helper returned no text delivery receipt', data={'attemptCount': 1})
        if (receipt.get('sessionId') != normalized_session_id
                or receipt.get('sessionName') != indexed_session.name
                or receipt.get('chatType') != indexed_session.chat_type.value):
            return OperationResult.failed(ErrorCode.CONVERSATION_CHANGED,
                'macOS Helper delivery receipt does not match the indexed conversation', data={'attemptCount': 1})
        if (receipt.get('verified') is not True or receipt.get('attemptCount') != 1
                or receipt.get('returnPressCount') != 1):
            return OperationResult.failed(ErrorCode.ACTION_NOT_VERIFIED,
                'macOS Helper did not verify the single text delivery', data={'attemptCount': 1})
        return OperationResult.succeeded('macOS text delivery verified', verified=True,
            data={'session_id': normalized_session_id, 'message_id': receipt.get('messageId'),
                  'quote_message_id': quote_message_id, 'attemptCount': 1})
