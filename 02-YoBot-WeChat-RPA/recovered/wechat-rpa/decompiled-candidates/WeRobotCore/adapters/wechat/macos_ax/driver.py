# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: driver.marshal (Python 3.9)

'''Fail-closed macOS AX Driver backed by a signed native Helper client.'''
import asyncio
import base64
import binascii
import hashlib
import math
from pathlib import Path
import tempfile
from dataclasses import replace
from typing import Dict, Mapping, Optional, Sequence, Set, Tuple, Union
from urllib.parse import unquote, urlparse
from urllib.request import Request, urlopen
from WeRobotCore.domain import AccountInstance, AutomationError, CapabilityName, CapabilityState, CapabilityStatus, ChatType, ContactRecord, ConversationReadResult, ErrorCode, GroupRecord, InstanceId, InstanceState, MessageDirection, OperationResult, SessionSummary
from WeRobotCore.ports.wechat import NativeInstanceRef
from ipc import MacOSHelperCallError, MacOSHelperClient
from instance_binding import MacOSPersistedInstanceBinding
from mappers import MacOSDriverMapper, MacOSHelperPayloadError
MACOS_AX_DRIVER_ID = 'macos.ax.qt-4_x'
MACOS_CURRENT_ACCOUNT_ATTACH_CONFIRMATION = 'CONFIRM_VISIBLE_CURRENT_ACCOUNT_ONCE'
MACOS_CONTACT_PAGE_SIZE = 100
MACOS_CONTACT_MAX_PAGES = 100
MACOS_CONTACT_MAX_ITEMS = 5000
MACOS_CONTACT_FIRST_PAGE_TIMEOUT_SECONDS = 360
MACOS_CONTACT_CONTINUATION_TIMEOUT_SECONDS = 15

class MacOSHelperAction:
    DISCOVER_INSTANCES = 'wechat.instances.discover'
    ATTACH_INSTANCE = 'wechat.instance.attach'
    LIST_SESSIONS = 'wechat.sessions.list'
    RESOLVE_CONVERSATION_BY_NAME = 'wechat.conversation.resolve_by_name'
    READ_CONVERSATION = 'wechat.conversation.read'
    SEND_TEXT = 'wechat.message.send_text'
    SEND_IMAGE = 'wechat.message.send_image'
    SEND_FILE = 'wechat.message.send_file'
    SEND_FAVORITE = 'wechat.message.send_favorite'
    FORWARD_MESSAGE = 'wechat.message.forward'
    LIST_CONTACTS = 'wechat.contacts.list'
    LIST_GROUPS = 'wechat.groups.list'
    READ_CHAT_CONTACT_PROFILE = 'wechat.contact.read_chat_profile'
    READ_GROUP_MESSAGE_SENDER = 'wechat.group.read_message_sender'
    PREPARE_GROUP_MENTION = 'wechat.group.mention.prepare'
    CLEAR_GROUP_MENTION = 'wechat.group.mention.clear'
    SEND_GROUP_MENTION_TEXT = 'wechat.group.mention.send_text'
    SEND_GROUP_MENTION_IMAGE = 'wechat.group.mention.send_image'
    SEND_GROUP_MENTION_FILE = 'wechat.group.mention.send_file'
    OPEN_MOMENTS = 'wechat.moments.open'
    READ_MOMENTS = 'wechat.moments.read'
    SCROLL_MOMENTS = 'wechat.moments.scroll'
    LIKE_MOMENT = 'wechat.moments.like'
    COMMENT_MOMENT = 'wechat.moments.comment'
    PUBLISH_MOMENT = 'wechat.moments.publish'
    CLOSE_MOMENTS = 'wechat.moments.close'
    ADD_FRIEND = 'wechat.friend.add'
    ACCEPT_FRIEND_REQUESTS = 'wechat.friend_request.accept'
    INVITE_GROUP_MEMBERS = 'wechat.group.invite_members'
    JOIN_GROUP_BY_INVITE = 'wechat.group.join_by_invite'


class MacOSAxDriver:
    '''Implement shared Ports while leaving native behavior in the Helper.

    M2-A deliberately has no concrete LaunchServices/socket transport.  A
    production composition must inject the authenticated transport and must
    explicitly enable each capability after its own M2 gate closes.
    '''
    
    def __init__(self = None, helper_client = None, *, capabilities, driver_id, mapper):
        if not isinstance(helper_client, MacOSHelperClient):
            raise TypeError('helper_client must be a MacOSHelperClient')
        if not isinstance(capabilities, Mapping):
            raise TypeError('capabilities must be a mapping')
        if not isinstance(driver_id, str) or driver_id.strip():
            raise ValueError('driver_id must be a non-empty string')
        self._helper = helper_client
        self._driver_id = driver_id.strip()
        if not mapper:
            pass
        self._mapper = MacOSDriverMapper()
        self._capabilities = self._validated_capabilities(capabilities)
        self._attached = { }
        self._bindings = { }
        self._lifecycle_lock = None
        self._operation_locks = { }
        self._confirmed_group_session_ids = set()
        self._verified_incoming_messages = { }
        self._session_index = { }
        self._persisted_restore_suppressed = set()

    
    def driver_id(self = None):
        return self._driver_id

    driver_id = None(driver_id)
    
    def capabilities(self = None):
        return dict(self._capabilities)

    capabilities = None(capabilities)
    
    def confirm_visible_current_account_once(self = None, confirmation = None):
        '''Validate the retired development token without changing state.

        This compatibility shim lets an older source-only harness call the
        method while the product path performs automatic current-account
        capture.  It must never arm or authorize a later Helper request.
        '''
        if confirmation != MACOS_CURRENT_ACCOUNT_ATTACH_CONFIRMATION:
            raise AutomationError(ErrorCode.CONFIRMATION_REQUIRED, 'exact current-account attachment confirmation is required')

    
    def _validated_capabilities(values = None):
        result = { }
        for name, state in values.items():
            if not isinstance(name, str) or name.strip():
                raise ValueError('capability names must be non-empty strings')
            if isinstance(state, CapabilityState) or state.name != name:
                raise TypeError('capability values must match their mapping key')
            result[name] = state
        return dict(result)

    _validated_capabilities = None(_validated_capabilities)
    
    def _capability(self = None, name = None):
        return self._capabilities.get(name, CapabilityState(name, CapabilityStatus.UNAVAILABLE, 'MACOS_CAPABILITY_NOT_DECLARED', **('name', 'status', 'reason_code')))

    
    def _capability_error(state = None):
        if state.status is CapabilityStatus.PERMISSION_REQUIRED:
            return ErrorCode.PERMISSION_REQUIRED
        if None.status is CapabilityStatus.CLIENT_VERSION_UNSUPPORTED:
            return ErrorCode.CLIENT_VERSION_UNSUPPORTED
        return None.CAPABILITY_UNAVAILABLE

    _capability_error = None(_capability_error)
    
    def _require_capability(self = None, name = None):
        state = self._capability(name)
        if state.available:
            return None
        if not state.reason_code:
            pass
        raise None(self._capability_error(state), 'macOS capability is unavailable: {}'.format(name))

    
    def _write_capability_failure(self = None, name = None):
        state = self._capability(name)
        if state.available:
            return None
        if not state.reason_code:
            pass
        return None.failed(self._capability_error(state), 'macOS capability is unavailable: {}'.format(name))

    
    def _attached_instance(self = None, instance_id = None):
        if not isinstance(instance_id, InstanceId):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'instance_id must be an InstanceId')
        instance = self._attached.get(instance_id)
        if instance is None:
            raise AutomationError(ErrorCode.INSTANCE_NOT_READY, 'macOS WeChat instance is not attached: {}'.format(instance_id))
        return instance

    
    def _operation_lock(self = None, instance_id = None):
        self._attached_instance(instance_id)
        lock = self._operation_locks.get(instance_id)
        if lock is None:
            lock = asyncio.Lock()
            self._operation_locks[instance_id] = lock
        return lock

    
    def _instance_lifecycle_lock(self = None):
        if self._lifecycle_lock is None:
            self._lifecycle_lock = asyncio.Lock()
        return self._lifecycle_lock

    
    def _instance_arguments(self = None, instance_id = None):
        self._attached_instance(instance_id)
        binding = self._bindings.get(instance_id)
        if binding is None:
            raise AutomationError(ErrorCode.INSTANCE_NOT_READY, 'macOS native binding is unavailable: {}'.format(instance_id))
        return {
            'instanceId': str(instance_id),
            'nativeKey': binding.native_key,
            'processId': binding.process_id }

    
    def _same_native_ref(expected = None, actual = None):
        if expected.platform.strip().lower() == actual.platform.strip().lower() and expected.native_key == actual.native_key:
            pass
        return expected.process_id == actual.process_id

    _same_native_ref = None(_same_native_ref)
    
    async def discover(self = None):
        self._require_capability(CapabilityName.INSTANCE_ATTACH.value)
    # WARNING: Decompyle incomplete

    
    async def reconcile_discovered_bindings(self = None, refs = None, persisted = None):
        '''Rebuild one process-local binding from a verified passive scan.

        ``discover()`` has already asked the signed Helper to verify a unique,
        logged-in WeChat process and its main-window anchors.  A persisted
        binding may therefore restore normalized identity only when its opaque
        native key and PID match that fresh reference exactly.  No attach
        Helper action, profile read, focus change or pointer event occurs here.
        '''
        normalized = tuple(refs)
        if any((lambda .0: for ref in .0:
not isinstance(ref, NativeInstanceRef))(normalized)):
            raise TypeError('refs must contain NativeInstanceRef values')
        if len(normalized) > 1:
            raise ValueError('macOS MVP accepts at most one discovered instance')
        if not persisted is not None and isinstance(persisted, MacOSPersistedInstanceBinding):
            raise TypeError('persisted must be a MacOSPersistedInstanceBinding')
    # WARNING: Decompyle incomplete

    
    async def attach(self = None, ref = None):
        self._require_capability(CapabilityName.INSTANCE_ATTACH.value)
        self._require_capability(CapabilityName.ACCOUNT_READ_CURRENT.value)
        if not isinstance(ref, NativeInstanceRef):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'ref must be a NativeInstanceRef')
        if ref.platform.strip().lower() not in frozenset({'darwin', 'macos'}):
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'native instance does not belong to macOS')
        if ref.payload is not None:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'macOS native references must not carry public payloads')
    # WARNING: Decompyle incomplete

    
    async def detach(self = None, instance_id = None):
        '''Release one process-local binding without mutating WeChat.

        The formal Helper does not own persistent instance bindings and does
        not expose a native detach action.  Attachment state below is entirely
        process local, so detaching means waiting for any in-flight operation
        and then forgetting the verified account/native reference.  Product
        "exit management" is a separate command with persisted intent and
        must never be inferred from this low-level Port operation.
        '''
        pass
    # WARNING: Decompyle incomplete

    
    async def list_attached(self = None):
        return tuple(self._attached.values())

    
    async def get_by_account(self = None, account_id = None):
        if not isinstance(account_id, str) or account_id.strip():
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'account_id must be a non-empty string')
        return None((lambda .0 = None: 