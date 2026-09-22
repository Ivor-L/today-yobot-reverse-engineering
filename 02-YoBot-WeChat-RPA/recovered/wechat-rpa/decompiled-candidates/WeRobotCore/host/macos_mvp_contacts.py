# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_contacts.marshal (Python 3.9)

'''Legacy UI contact routes over the normalized macOS directory pipeline.

The shared Vue application keeps its mature HTTP contract. This adapter is
shared by the complete W1 IDE candidate and production Agent plugin; it owns
Mac path selection and response projection, while collection and normalization
remain in ``AutomationContextContactSyncService`` and the Mac Driver.
'''
from __future__ import annotations
import asyncio
import hmac
import re
import time
from typing import Any, Callable, Dict, List, Literal, Mapping, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, ConfigDict
from WeRobotCore.adapters.contact_storage import ExplicitPathContactStore
from WeRobotCore.adapters.control import ExplicitPathAutoReplyConfigurationStore
from WeRobotCore.application.contacts import AutomationContextContactSyncService, ContactSyncOutcome
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from WeRobotCore.domain import AccountInstance, AutomationError, InstanceState
from macos_process import MacOSControlProcessRuntime
MACOS_MVP_CONTACT_SYNC_PATH = '/api/contact/sync'
MACOS_MVP_CONTACTS_PATH = '/api/contacts'
MACOS_MVP_GROUPS_PATH = '/api/contacts/groups'
MACOS_MVP_CONTACT_TAGS_PATH = '/api/contacts/tags'
MACOS_MVP_GROUP_TAGS_PATH = '/api/contacts/group_tags'
MACOS_MVP_SET_GROUP_TAG_PATH = '/api/contacts/groups/set-tag'
MACOS_MVP_CURRENT_USER_PATH = '/api/user/current'
MACOS_MVP_CONNECTION_STATUS_PATH = '/api/connection/status'
MACOS_MVP_GROUP_INVITE_PATH = '/api/contacts/invite-to-group'
MACOS_MVP_SYNC_CONTACTS_TASK_PATH = '/api/tasks/sync-contacts'
MACOS_MVP_SYNC_CONTACTS_STATUS_PATH = '/api/tasks/sync-contacts/status'
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_contacts_installed'

class MacOSMvpContactSyncRequest(BaseModel):
    model_config = ConfigDict('forbid', **('extra',))
    type: "Literal['friend', 'group']" = 'friend'
    account_id: 'Optional[str]' = None


class MacOSMvpScheduledContactSyncRequest(BaseModel):
    sync_items: 'List[str]' = 'MacOSMvpScheduledContactSyncRequest'
    sync_frequency: 'int' = 5
    time_range_start: 'str' = '02:00'
    time_range_end: 'str' = '04:00'
    enabled: 'bool' = True


class MacOSMvpGroupInviteRequest(BaseModel):
    account_id: 'str' = ConfigDict('forbid', **('extra',))


class MacOSMvpGroupTagBatchRequest(BaseModel):
    tag: 'str' = ConfigDict('forbid', **('extra',))


def _error(status_code = None, code = None, message = None):
    return HTTPException(status_code, {
        'code': code,
        'message': message }, **('status_code', 'detail'))


async def _account(gateway = None, requested_account_id = None):
    await gateway.runtime.instances.list_attached()
    attached = tuple(<NODE:28>)
    complete = tuple((lambda .0: 