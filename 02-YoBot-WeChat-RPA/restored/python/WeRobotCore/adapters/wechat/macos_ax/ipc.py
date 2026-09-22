"""Helper protocol reconstructed from the installed Python 3.9 bytecode.

No native transport is supplied here. The caller injects the original
session factory responsible for launch, socket and signature verification.
"""
import asyncio
import json
import uuid
from typing import Any, Callable, Mapping, Optional, Protocol, runtime_checkable
from WeRobotCore.application.control_access import (
    ControlAccessAuthorizer, ControlAccessDeniedError, require_control_access,
)
from WeRobotCore.domain import AutomationError, ErrorCode

MACOS_HELPER_PROTOCOL_VERSION = 1
MACOS_HELPER_MAX_FRAME_BYTES = 65536


@runtime_checkable
class MacOSHelperTransport(Protocol):
    async def exchange(self, request: Mapping[str, Any], timeout_seconds: float):
        ...


@runtime_checkable
class MacOSHelperSession(Protocol):
    async def exchange_frame(self, request: Mapping[str, Any], timeout_seconds: float):
        ...

    async def close(self):
        ...


@runtime_checkable
class MacOSHelperSessionFactory(Protocol):
    async def open_session(self, timeout_seconds: float):
        ...


class MacOSHelperCallError(AutomationError):
    def __init__(self, code: ErrorCode, helper_code: str, message: str, retryable: bool = False):
        super().__init__(code, message, retryable=retryable)
        self.helper_code = helper_code


# The mapping below is copied from the bytecode's literal mapping, not inferred.
_HELPER_ERROR_CODES = {
    'IPC_VERSION_UNSUPPORTED': ErrorCode.CLIENT_VERSION_UNSUPPORTED,
    'REQUEST_ID_REQUIRED': ErrorCode.INVALID_ARGUMENT,
    'REQUEST_ID_REUSED': ErrorCode.INVALID_ARGUMENT,
    'ACTION_UNSUPPORTED': ErrorCode.CAPABILITY_UNAVAILABLE,
    'INVALID_ARGUMENT': ErrorCode.INVALID_ARGUMENT,
    'ACCESSIBILITY_PERMISSION_REQUIRED': ErrorCode.PERMISSION_REQUIRED,
    'SCREEN_RECORDING_PERMISSION_REQUIRED': ErrorCode.PERMISSION_REQUIRED,
    'LIVE_READ_CONFIRMATION_REQUIRED': ErrorCode.CONFIRMATION_REQUIRED,
    'LIVE_WRITE_CONFIRMATION_REQUIRED': ErrorCode.CONFIRMATION_REQUIRED,
    'OPERATOR_CONFIRMATION_REQUIRED': ErrorCode.CONFIRMATION_REQUIRED,
    'READ_LIMIT_INVALID': ErrorCode.INVALID_ARGUMENT,
    'INSTANCE_NOT_FOUND': ErrorCode.INSTANCE_NOT_FOUND,
    'INSTANCE_NOT_READY': ErrorCode.INSTANCE_NOT_READY,
    'ACCOUNT_NOT_INITIALIZED': ErrorCode.ACCOUNT_NOT_INITIALIZED,
    'WECHAT_PROFILE_ALREADY_VISIBLE': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_PROFILE_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_PROFILE_CLOSE_NOT_VERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_PROFILE_ID_MISSING': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_AVATAR_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_AVATAR_ANCHOR_INVALID': ErrorCode.ELEMENT_NOT_FOUND,
    'CLIENT_VERSION_UNSUPPORTED': ErrorCode.CLIENT_VERSION_UNSUPPORTED,
    'ELEMENT_NOT_FOUND': ErrorCode.ELEMENT_NOT_FOUND,
    'WINDOW_OCCLUDED': ErrorCode.WINDOW_OCCLUDED,
    'CONVERSATION_CHANGED': ErrorCode.CONVERSATION_CHANGED,
    'ACTION_NOT_VERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'OPERATION_TIMEOUT': ErrorCode.OPERATION_TIMEOUT,
    'RATE_LIMITED': ErrorCode.RATE_LIMITED,
    'WECHAT_PROCESS_NOT_FOUND': ErrorCode.INSTANCE_NOT_FOUND,
    'WECHAT_MAIN_WINDOW_NOT_FOUND': ErrorCode.INSTANCE_NOT_READY,
    'WECHAT_ANCHOR_INVALID': ErrorCode.ELEMENT_NOT_FOUND,
    'AX_TREE_LIMIT_REACHED': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_CHAT_TITLE_MISSING': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_CHAT_TYPE_UNSUPPORTED': ErrorCode.CAPABILITY_UNAVAILABLE,
    'WECHAT_SESSION_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_CHAT_TYPE_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_MESSAGE_LIST_MISSING': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_SEND_PRIVATE_CHAT_REQUIRED': ErrorCode.CONVERSATION_CHANGED,
    'WECHAT_SEND_WINDOW_NOT_READY': ErrorCode.WINDOW_OCCLUDED,
    'WECHAT_SEND_WINDOW_NOT_FRONTMOST': ErrorCode.WINDOW_OCCLUDED,
    'WECHAT_SEND_MAIN_WINDOW_NOT_FOCUSED': ErrorCode.WINDOW_OCCLUDED,
    'WECHAT_SEND_CLEARED_UNVERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_REMAINS_STAGED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_RETURN_EVENT_FAILED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_QUOTE_UNSUPPORTED': ErrorCode.CAPABILITY_UNAVAILABLE,
    'WECHAT_SEND_QUOTE_NOT_VERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_CHAT_TYPE_UNRESOLVED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_DRAFT_NOT_EMPTY': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_INPUT_FOCUS_FAILED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_STAGE_FAILED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_STAGE_MISMATCH': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_STAGE_UNVERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_PASTE_EVENT_FAILED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SEND_ASSET_INVALID': ErrorCode.INVALID_ARGUMENT,
    'WECHAT_SEND_CONTROL_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_BUTTON_MISSING': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_FAVORITE_BUTTON_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SHEET_NOT_OPEN': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SHEET_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_CONTROL_AMBIGUOUS': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SEARCH_DRAFT_PRESENT': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SEARCH_NOT_FOCUSED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SEARCH_INPUT_FAILED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SEARCH_NOT_READY': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_RESULT_NOT_FOUND': ErrorCode.ELEMENT_NOT_FOUND,
    'WECHAT_FAVORITE_RESULT_CHANGED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_SELECTION_UNVERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_FAVORITE_DELIVERY_UNVERIFIED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SNAPSHOT_CURSOR_INVALID': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SNAPSHOT_BINDING_CHANGED': ErrorCode.CONVERSATION_CHANGED,
    'WECHAT_SNAPSHOT_PAGE_SIZE_CHANGED': ErrorCode.ACTION_NOT_VERIFIED,
    'WECHAT_SNAPSHOT_LEASE_EXPIRED': ErrorCode.OPERATION_TIMEOUT,
    'WECHAT_SNAPSHOT_LEASE_ACTIVE': ErrorCode.RATE_LIMITED,
    'WECHAT_SNAPSHOT_ACTION_CHANGED': ErrorCode.ACTION_NOT_VERIFIED }

def map_helper_error_code(helper_code: str):
    if not isinstance(helper_code, str) or not helper_code.strip():
        return ErrorCode.OPERATION_FAILED
    normalized = helper_code.strip().upper()
    if normalized.endswith('_PERMISSION_REQUIRED'):
        return ErrorCode.PERMISSION_REQUIRED
    if normalized.endswith('_CONFIRMATION_REQUIRED'):
        return ErrorCode.CONFIRMATION_REQUIRED
    if normalized.endswith('_NOT_FOUND'):
        return ErrorCode.ELEMENT_NOT_FOUND
    return _HELPER_ERROR_CODES.get(normalized, ErrorCode.OPERATION_FAILED)


class SessionMacOSHelperTransport:
    _SNAPSHOT_PAGES = {
        'wechat.contacts.list': 'contactPage',
        'wechat.groups.list': 'groupPage',
    }

    def __init__(self, session_factory: MacOSHelperSessionFactory):
        if not isinstance(session_factory, MacOSHelperSessionFactory):
            raise TypeError('session_factory must implement MacOSHelperSessionFactory')
        self._session_factory = session_factory
        self._session = None
        self._snapshot_action = None
        self._expected_cursor = None
        self._lock = None

    def _exchange_lock(self):
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    async def exchange(self, request: Mapping[str, Any], timeout_seconds: float):
        if not isinstance(request, Mapping):
            raise TypeError('request must be a mapping')
        if timeout_seconds <= 0:
            raise ValueError('timeout_seconds must be positive')
        async with self._exchange_lock():
            action = request.get('action')
            arguments = request.get('arguments')
            if not isinstance(arguments, Mapping):
                arguments = {}
            cursor = arguments.get('cursor')
            if self._snapshot_action is not None:
                if action != self._snapshot_action or cursor != self._expected_cursor:
                    await self._close_session(suppress_errors=True)
                    raise MacOSHelperCallError(
                        ErrorCode.ACTION_NOT_VERIFIED, 'IPC_SNAPSHOT_SESSION_MISMATCH',
                        'macOS Helper snapshot continuation does not match the active session',
                    )
            elif action in self._SNAPSHOT_PAGES and cursor is not None:
                raise MacOSHelperCallError(
                    ErrorCode.ACTION_NOT_VERIFIED, 'IPC_SNAPSHOT_SESSION_MISSING',
                    'macOS Helper snapshot continuation has no active session',
                )
            if self._session is None:
                self._session = await self._session_factory.open_session(timeout_seconds)
            try:
                response = await self._session.exchange_frame(request, timeout_seconds)
                await self._apply_response_lifecycle(action, response)
                return response
            except BaseException:
                await self._close_session(suppress_errors=True)
                raise

    async def abort_active_session(self):
        async with self._exchange_lock():
            await self._close_session(suppress_errors=True)

    async def _apply_response_lifecycle(self, action, response):
        page_key = self._SNAPSHOT_PAGES.get(action)
        if not isinstance(response, Mapping) or response.get('success') is not True:
            self._snapshot_action = None
            self._expected_cursor = None
            return
        result = response.get('result')
        page = result.get(page_key) if page_key and isinstance(result, Mapping) else None
        if not isinstance(page, Mapping):
            return
        complete = page.get('complete')
        next_cursor = page.get('nextCursor')
        if complete is False and isinstance(next_cursor, str) and next_cursor.strip():
            self._snapshot_action = str(action)
            self._expected_cursor = next_cursor
            return
        self._snapshot_action = None
        self._expected_cursor = None

    async def _close_session(self, *, suppress_errors: bool):
        session = self._session
        self._session = None
        self._snapshot_action = None
        self._expected_cursor = None
        if session is None:
            return
        try:
            await session.close()
        except Exception:
            if not suppress_errors:
                raise


class MacOSHelperClient:
    def __init__(self, transport: MacOSHelperTransport, *,
                 protocol_version: int = MACOS_HELPER_PROTOCOL_VERSION,
                 default_timeout_seconds: float = 8.0,
                 request_id_factory: Optional[Callable[[], str]] = None):
        if not isinstance(transport, MacOSHelperTransport):
            raise TypeError('transport must implement MacOSHelperTransport')
        if not isinstance(protocol_version, int) or protocol_version <= 0:
            raise ValueError('protocol_version must be a positive integer')
        if default_timeout_seconds <= 0:
            raise ValueError('default_timeout_seconds must be positive')
        self._transport = transport
        self._protocol_version = protocol_version
        self._default_timeout_seconds = float(default_timeout_seconds)
        self._request_id_factory = request_id_factory or (lambda: str(uuid.uuid4()))
        self._access_authorizer = None

    @property
    def protocol_version(self):
        return self._protocol_version

    @property
    def access_authorizer_bound(self):
        return self._access_authorizer is not None

    def bind_access_authorizer(self, authorizer: ControlAccessAuthorizer):
        if not callable(authorizer):
            raise TypeError('authorizer must be callable')
        if self._access_authorizer is not None:
            raise RuntimeError('macOS Helper access authorizer is already bound')
        self._access_authorizer = authorizer

    async def _require_bound_access(self):
        authorizer = self._access_authorizer
        if authorizer is None:
            return
        try:
            await require_control_access(authorizer)
        except ControlAccessDeniedError as exc:
            decision = exc.decision
            raise MacOSHelperCallError(
                ErrorCode.OPERATION_FAILED, decision.code, decision.message,
                retryable=decision.status_code >= 500,
            ) from exc

    async def call(self, action: str, arguments: Optional[Mapping[str, Any]] = None,
                   *, timeout_seconds: Optional[float] = None):
        if not isinstance(action, str) or not action.strip():
            raise ValueError('action must be a non-empty string')
        if arguments is not None and not isinstance(arguments, Mapping):
            raise TypeError('arguments must be a mapping')
        timeout = self._default_timeout_seconds if timeout_seconds is None else float(timeout_seconds)
        if timeout <= 0:
            raise ValueError('timeout_seconds must be positive')
        await self._require_bound_access()
        request_id = self._request_id_factory()
        if not isinstance(request_id, str) or not request_id.strip():
            raise ValueError('request_id_factory must return a non-empty string')
        request = {
            'protocolVersion': self._protocol_version,
            'requestId': request_id,
            'action': action.strip(),
            'arguments': dict(arguments or {}),
        }
        self._require_bounded_json(request, 'request')
        try:
            response = await self._transport.exchange(request, timeout)
        except MacOSHelperCallError:
            raise
        except asyncio.TimeoutError as exc:
            raise MacOSHelperCallError(ErrorCode.OPERATION_TIMEOUT, 'IPC_TIMEOUT',
                                       'macOS Helper IPC timed out') from exc
        except Exception as exc:
            raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_EXCHANGE_FAILED',
                                       'macOS Helper IPC exchange failed: {}'.format(exc)) from exc
        try:
            if not isinstance(response, Mapping):
                raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_INVALID_RESPONSE',
                                           'macOS Helper returned a non-object response')
            self._require_bounded_json(response, 'response')
            if response.get('protocolVersion') != self._protocol_version:
                raise MacOSHelperCallError(ErrorCode.CLIENT_VERSION_UNSUPPORTED, 'IPC_VERSION_UNSUPPORTED',
                                           'macOS Helper response protocolVersion does not match')
            if response.get('requestId') != request_id:
                raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_REQUEST_ID_MISMATCH',
                                           'macOS Helper response requestId does not match')
            success = response.get('success')
            if not isinstance(success, bool):
                raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_INVALID_RESPONSE',
                                           'macOS Helper response success must be a boolean')
        except BaseException:
            await self.abort_active_session()
            raise
        if success is False:
            error = response.get('error')
            if not isinstance(error, Mapping):
                await self.abort_active_session()
                raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_INVALID_RESPONSE',
                                           'macOS Helper failure response must contain an error object')
            helper_code = error.get('code')
            message = error.get('message')
            if not (isinstance(helper_code, str) and helper_code.strip()
                    and isinstance(message, str) and message.strip()):
                await self.abort_active_session()
                raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_INVALID_RESPONSE',
                                           'macOS Helper failure response is incomplete')
            raise MacOSHelperCallError(map_helper_error_code(helper_code), helper_code, message)
        result = response.get('result')
        if result is None:
            return {}
        if not isinstance(result, Mapping):
            await self.abort_active_session()
            raise MacOSHelperCallError(ErrorCode.OPERATION_FAILED, 'IPC_INVALID_RESULT',
                                       'macOS Helper success result must be an object')
        return dict(result)

    async def close(self):
        await self.abort_active_session()

    async def abort_active_session(self):
        abort = getattr(self._transport, 'abort_active_session', None)
        if abort is None or not callable(abort):
            return
        outcome = abort()
        if asyncio.iscoroutine(outcome):
            await outcome

    @staticmethod
    def _require_bounded_json(value, label: str):
        try:
            encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':'),
                                 sort_keys=True).encode('utf-8')
        except (TypeError, ValueError) as exc:
            raise ValueError('{} must be JSON serializable'.format(label)) from exc
        if len(encoded) >= MACOS_HELPER_MAX_FRAME_BYTES:
            raise ValueError('{} exceeds the macOS Helper frame limit'.format(label))
