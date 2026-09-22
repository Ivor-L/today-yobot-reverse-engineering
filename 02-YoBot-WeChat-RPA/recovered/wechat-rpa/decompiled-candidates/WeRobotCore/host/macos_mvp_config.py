# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_mvp_config.marshal (Python 3.9)

'''Mac MVP configuration routes consumed by the shared Windows/Vue UI.

The signed W1 IDE candidate and production Agent plugin share this adapter.
The HTTP shape stays compatible with the existing frontend while persistence
uses explicit macOS paths and Keychain references instead of the Windows
``ConfigManager`` singleton or DPAPI.
'''
from __future__ import annotations
import asyncio
from email.parser import BytesParser
from email.policy import default as email_policy
import hashlib
import hmac
import os
from pathlib import Path
from typing import Any, Dict, Mapping, Optional, Sequence, Tuple
from fastapi import APIRouter, HTTPException, Query, Request, Security, status
from fastapi.security import APIKeyHeader
from WeRobotCore.adapters.control import ExplicitPathAutoReplyConfigurationStore, discover_macos_auto_reply_secret_keys, macos_agent_api_token_secret_key, macos_coze_token_secret_key
from WeRobotCore.application.auto_reply import PreloadedAutoReplySecretSnapshot, refresh_auto_reply_secrets
from WeRobotCore.application.runtime import WeChatAutomationGateway
from WeRobotCore.bootstrap.macos_capabilities import MACOS_MVP_CAPABILITY_NAMES
from WeRobotCore.domain import AccountInstance
from WeRobotCore.ports import SecretStore
from WeRobotCore.services.agentic_service import DELIVERY_MODES, RESPONSE_FORMATS, is_loopback_api_url, validate_api_url
from macos_process import MacOSControlProcessRuntime
MACOS_MVP_CONFIG_PATH = '/api/config/{config_type}'
MACOS_MVP_UI_CONFIG_TYPES = frozenset(('agents', 'reply_strategy_v2', 'chat_history_settings', 'coze_settings', 'greeting_config', 'moment_settings', 'operation_sops', 'rest_time_settings', 'sop_cache'))
_INSTALLATION_STATE_KEY = 'yokowebot_macos_mvp_config_installed'
_MAX_AGENTS = 10
_MAX_TEXT_LENGTH = 1024
_MAX_GREETING_GROUPS = 30
_MAX_GREETINGS_PER_GROUP = 5
_MAX_GREETING_ASSET_BYTES = 104857600
_MAX_GREETING_UPLOAD_BYTES = _MAX_GREETING_ASSET_BYTES + 1048576
_GREETING_TYPES = frozenset(('text', 'file', 'agent', 'favorite'))
_SOP_ACTION_TYPES = frozenset(('pull_into_group', 'greeting', 'create_follow'))
_MOMENT_INTERACTION_MODES = frozenset(('like_only', 'comment_only', 'like_and_comment', 'like_always_and_comment'))
_REST_TIME_TASKS = frozenset(('朋友圈评论', '自动加好友', '自动通过好友'))

def _text(value = None, field_name = None, *, maximum):
    if not isinstance(value, str) or value.strip():
        raise ValueError('{} must be a non-empty string'.format(field_name))
    normalized = value.strip()
    if len(normalized) > maximum:
        raise ValueError('{} exceeds the length limit'.format(field_name))
    return normalized


def _strict_int(value = None, field_name = None, *, minimum, maximum):
    if isinstance(value, int) or isinstance(value, bool):
        raise ValueError('{} must be an integer'.format(field_name))
    if not value <= value or value <= maximum:
        pass
    else:
        minimum
    raise ValueError('{} must be between {} and {}'.format(field_name, minimum, maximum))
    return value


def _existing_agent(agents = None, agent_id = None, bot_id = None):
