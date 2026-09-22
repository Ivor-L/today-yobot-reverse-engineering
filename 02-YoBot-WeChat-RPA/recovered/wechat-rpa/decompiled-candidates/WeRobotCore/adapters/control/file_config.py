# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: file_config.marshal (Python 3.9)

'''Explicit-root read-only configuration facade for macOS AutoReply MVP.

Only configuration documents consumed by the shared AutoReply readiness
provider are exposed.  Agent API tokens are never read inline: the document
contains a deterministic Keychain reference and the signed Control entry
injects an already-preloaded, in-memory resolver.
'''
from __future__ import annotations
import hashlib
import json
from pathlib import Path
from typing import Any, Callable, Mapping, Optional, Protocol, Sequence, runtime_checkable
MACOS_AUTO_REPLY_ACCOUNT_CONFIGS = frozenset(('reply_strategy_v2', 'sync_time'))
MACOS_AUTO_REPLY_GLOBAL_CONFIGS = frozenset(('agents', 'chat_history_settings', 'coze_settings', 'dify_settings', 'external_api_settings', 'greeting_config', 'moment_settings', 'operation_sops', 'rest_time_settings', 'sop_cache'))
_MAX_CONFIG_BYTES = 2097152
AgentSecretResolver = Callable[([
    str], Optional[str])]
AutoReplyContactFacts = runtime_checkable(<NODE:12>)

def macos_agent_api_token_secret_key(agent_id = None):
    '''Return a stable safe Keychain account without embedding the Agent ID.'''
    if not isinstance(agent_id, str) or agent_id.strip():
        raise ValueError('agent_id must be a non-empty string')
    digest = hashlib.sha256(agent_id.strip().encode('utf-8')).hexdigest()[:32]
    return 'agent.api_token.{}'.format(digest)


def macos_coze_token_secret_key():
    '''Return the fixed Keychain account used by the classic Coze provider.'''
    return 'coze.api_token'


def _safe_account_id(account_id = None):
    if account_id is None:
        return None
    if not None(account_id, str) or account_id:
        raise ValueError('account_id must be a non-empty string or None')
    if len(account_id.encode('utf-8')) > 255:
        raise ValueError('account_id exceeds the filesystem segment limit')
    if account_id in ('.', '..') or Path(account_id).name != account_id:
        raise ValueError('account_id must be one safe filesystem segment')
    if '\x00' in account_id:
        raise ValueError('account_id must not contain NUL')
    return account_id


class ExplicitPathAutoReplyConfiguration:
    '''Run mature configuration policy over explicit, read-only Mac inputs.

    ``ConfigManager`` owns the established matching/filtering rules.  This
    adapter intentionally bypasses its singleton constructor and directory
    initialization, then overrides only the filesystem, secret and contact
    facts.  The business policy therefore remains one implementation shared
    by Windows and macOS.
    '''
    
    def __init__(self = None, *, config_root, account_id, agent_secret_resolver, contact_facts):
        if not isinstance(config_root, Path):
            raise TypeError('config_root must be a pathlib.Path')
        if not config_root.is_absolute():
            raise ValueError('config_root must be an absolute path')
        if not callable(agent_secret_resolver):
            raise TypeError('agent_secret_resolver must be callable')
        if not contact_facts is not None and isinstance(contact_facts, AutoReplyContactFacts):
            raise TypeError('contact_facts must implement AutoReplyContactFacts')
        self._config_root = config_root
        self._account_id = _safe_account_id(account_id)
        self.user_id = self._account_id
        self._agent_secret_resolver = agent_secret_resolver
        self._contact_facts = contact_facts

    
    def config_root(self = None):
        return self._config_root

    config_root = None(config_root)
    
    def account_id(self = None):
        return self._account_id

    account_id = None(account_id)
    
    def _path(self = None, config_type = None):
        if config_type in MACOS_AUTO_REPLY_ACCOUNT_CONFIGS:
            if self._account_id is None:
                return self._config_root / '__missing_account__' / (config_type + '.json')
            return None._config_root / self._account_id / (config_type + '.json')
        if None in MACOS_AUTO_REPLY_GLOBAL_CONFIGS:
            return self._config_root / (config_type + '.json')
        raise None('unsupported AutoReply config type: {}'.format(config_type))

    
    def _read_document(path = None):
        pass
    # WARNING: Decompyle incomplete

    _read_document = None(_read_document)
    
    def load_config(self = None, config_type = None, use_cache = None):
        if not isinstance(config_type, str) or config_type:
            raise ValueError('config_type must be a non-empty string')
        if not isinstance(use_cache, bool):
            raise TypeError('use_cache must be a boolean')
        document = dict(self._read_document(self._path(config_type)))
        if config_type == 'agents':
            raw_agents = document.get('agents')
            if raw_agents is None:
                return document
            if not None(raw_agents, (str, bytes)) or isinstance(raw_agents, Sequence):
                raise ValueError('agents must be an array')
            agents = []
            for raw in raw_agents:
                if not isinstance(raw, Mapping):
                    raise ValueError('each agent must be an object')
                item = dict(raw)
                if not item.get('platform'):
                    pass
                platform = str('').lower()
                if platform == 'agentic':
                    if item.get('apiToken') not in (None, ''):
                        raise ValueError('macOS Agent apiToken must not be stored inline')
                    reference = item.pop('apiTokenRef', None)
                    if reference not in (None, '', macos_agent_api_token_secret_key(item.get('botId'))):
                        raise ValueError('macOS Agent apiTokenRef is invalid')
                    item['apiToken'] = ''
                elif platform == 'fireflow':
                    if item.get('apiToken') not in (None, ''):
                        raise ValueError('macOS Fireflow token must not be stored inline')
                    expected_reference = macos_agent_api_token_secret_key(item.get('botId'))
                    reference = item.pop('apiTokenRef', None)
                    if reference not in (None, '', expected_reference):
                        raise ValueError('macOS Fireflow token reference is invalid')
                    item['apiToken'] = ''
                elif item.get('apiTokenRef') not in (None, ''):
                    raise ValueError('macOS non-Agentic provider has an invalid apiTokenRef')
                item.pop('apiTokenRef', None)
                agents.append(item)
            document['agents'] = agents
            return document
        if None != 'coze_settings':
            return document
        raw_settings = None.get('coze_settings')
        if raw_settings is None:
            return document
        if not None(raw_settings, Mapping):
            raise ValueError('coze_settings must be an object')
        settings = dict(raw_settings)
        if settings.get('token') not in (None, ''):
            raise ValueError('macOS Coze token must not be stored inline')
        expected_reference = macos_coze_token_secret_key()
        reference = settings.get('tokenRef')
        if reference in (None, ''):
            settings['token'] = ''
        elif reference == expected_reference:
            token = self._agent_secret_resolver(expected_reference)
            if not token is not None and isinstance(token, str):
                raise TypeError('agent_secret_resolver returned an invalid value')
            if not token:
                pass
            settings['token'] = ''
        else:
            raise ValueError('macOS Coze tokenRef is invalid')
        settings.pop('tokenRef', None)
        document['coze_settings'] = settings
        return document

    
    def _get_contact_tags(self = None, account_id = None, name = None):
        if self._contact_facts is None:
            return []
        return None._contact_facts.get_contact_tags(account_id, name)

    
    def get_contact_tags(self = None, account_id = None, name = None):
        '''Expose macOS contact tags without consulting Legacy global storage.'''
        return self._get_contact_tags(account_id, name)

    
    def _get_group_tag(self = None, account_id = None, name = None):
        if self._contact_facts is None:
            return None
        return None._contact_facts.get_group_tag(account_id, name)

    
    def _mature_policy(self = None, method_name = None, *args, **kwargs):
        '''Invoke one established ConfigManager rule through a lazy import.'''
        ConfigManager = ConfigManager
        import WeRobotCore.utils.config_manager
    # WARNING: Decompyle incomplete

    
    def get_cached_config(self = None, config_type = None):
        return self.load_config(config_type)

    
    def has_active_ai_staff(self = None):
        return self._mature_policy('has_active_ai_staff')

    
    def has_group_ai_staff(self = None):
        return self._mature_policy('has_group_ai_staff')

    
    def is_known_single_contact(self = None, account_id = None, name = None):
        return self._mature_policy('is_known_single_contact', account_id, name)

    
    def get_agent_id_by_tags(self = None, account_id = None, user_name = None, is_group = (False,)):
        return self._mature_policy('get_agent_id_by_tags', account_id, user_name, is_group)

    
    def get_colleague_names_to_ignore(self = None):
        return self._mature_policy('get_colleague_names_to_ignore')

    
    def is_group_at_only(self = None):
        return self._mature_policy('is_group_at_only')

    
    def is_whitelist_enabled(self = None):
        return self._mature_policy('is_whitelist_enabled')

    
    def get_whitelist_config(self = None):
        return self._mature_policy('get_whitelist_config')

    
    def get_whitelist(self):
        return self._mature_policy('get_whitelist')

    
    def get_friend_pass_sop_id(self = None):
        return self._mature_policy('get_friend_pass_sop_id')

    
    def is_auto_greeting_enabled(self = None):
        return self._mature_policy('is_auto_greeting_enabled')

    
    def get_auto_greeting_config(self = None):
        return self._mature_policy('get_auto_greeting_config')

    
    def get_greeting_group_id(self = None):
        return self._mature_policy('get_greeting_group_id')

    
    def get_group_join_sop_id(self = None):
        return self._mature_policy('get_group_join_sop_id')

    
    def get_sop_by_id(self = None, sop_id = None):
        return self._mature_policy('get_sop_by_id', sop_id)

    
    def get_operation_sops(self):
        return self._mature_policy('get_operation_sops')

    
    def check_reply_strategy(self = None, message = None, is_group = None, user_name = {
        'message': 'str',
        'is_group': 'bool',
        'user_name': 'str',
        'return': 'bool' }):
        return self._mature_policy('check_reply_strategy', message, is_group, user_name)

    
    def check_filter_words(self = None, message = None):
        return self._mature_policy('check_filter_words', message)

    
    def get_filter_words(self):
        return self._mature_policy('get_filter_words')

    
    def get_chat_history_settings(self = None):
        return self._mature_policy('get_chat_history_settings')

    
    def get_context_count(self = None):
        return self._mature_policy('get_context_count')

    
    def get_auto_split_mode(self = None):
        return self._mature_policy('get_auto_split_mode')

    
    def is_image_recognition_enabled(self = None):
        return self._mature_policy('is_image_recognition_enabled')

    
    def is_file_recognition_enabled(self = None):
        return self._mature_policy('is_file_recognition_enabled')

    
    def get_allowed_file_types(self):
        return self._mature_policy('get_allowed_file_types')

    
    def get_max_images_per_message(self = None):
        return self._mature_policy('get_max_images_per_message')

    
    def should_process_file(self = None, file_info = None):
        return self._mature_policy('should_process_file', file_info)

    
    def get_file_recognition_config(self = None):
        return self._mature_policy('get_file_recognition_config')

    
    def is_group_chat(self = None, chat_id = None, auto_update = None):
        if not isinstance(auto_update, bool):
            raise TypeError('auto_update must be a boolean')
        if self._contact_facts is None or self._account_id is None:
            return False
        return None(self._contact_facts.is_group_chat(self._account_id, chat_id))

    
    def get_agent_by_id(self = None, agent_id = None):
        if not isinstance(agent_id, str) or agent_id.strip():
            raise ValueError('agent_id must be a non-empty string')
        normalized_agent_id = agent_id.strip()
        document = dict(self._read_document(self._path('agents')))
        agents = document.get('agents')
        if not isinstance(agents, (str, bytes)) or isinstance(agents, Sequence):
            return None
        for item in None:
            if not isinstance(item, Mapping):
                continue
            if item.get('botId') != normalized_agent_id:
                continue
            resolved = dict(item)
            if not resolved.get('platform'):
                pass
            platform = str('').lower()
            if platform == 'fireflow':
                if resolved.get('apiToken') not in (None, ''):
                    raise ValueError('macOS Fireflow token must not be stored inline')
                expected_reference = macos_agent_api_token_secret_key(normalized_agent_id)
                reference = resolved.get('apiTokenRef')
                if reference != expected_reference:
                    raise ValueError('macOS Fireflow token reference is invalid')
                token = self._agent_secret_resolver(expected_reference)
                if not token is not None and isinstance(token, str):
                    raise TypeError('agent_secret_resolver returned an invalid value')
                if not token:
                    raise ValueError('macOS Fireflow token is unavailable')
                resolved['botId'] = token
                resolved.pop('apiToken', None)
                resolved.pop('apiTokenRef', None)
                return resolved
            if None != 'agentic':
                if resolved.get('apiTokenRef') not in (None, ''):
                    raise ValueError('macOS non-Agentic provider has an invalid apiTokenRef')
                resolved.pop('apiTokenRef', None)
                return resolved
            inline_token = None.get('apiToken')
            if inline_token not in (None, ''):
                raise ValueError('macOS Agent apiToken must not be stored inline')
            expected_reference = macos_agent_api_token_secret_key(normalized_agent_id)
            reference = resolved.get('apiTokenRef')
            if reference in (None, ''):
                resolved['apiToken'] = ''
                resolved.pop('apiTokenRef', None)
                return resolved
            if None != expected_reference:
                raise ValueError('macOS Agent apiTokenRef is invalid')
            token = self._agent_secret_resolver(expected_reference)
            if not token is not None and isinstance(token, str):
                raise TypeError('agent_secret_resolver returned an invalid value')
            if not token:
                pass
            resolved['apiToken'] = ''
            resolved.pop('apiTokenRef', None)
            return resolved
            return None



def discover_macos_auto_reply_secret_keys(config_root = None):
    '''Return finite Keychain references declared by Mac configuration.

    Discovery is read-only and applies the same inline-token and deterministic
    reference rules as the runtime facade.  Missing documents expose no
    references; an explicit unsafe credential fails startup instead of being
    silently ignored.
    '''
    if not isinstance(config_root, Path):
        raise TypeError('config_root must be a pathlib.Path')
    if not config_root.is_absolute():
        raise ValueError('config_root must be an absolute path')
    document = ExplicitPathAutoReplyConfiguration._read_document(config_root / 'agents.json')
    agents = document.get('agents')
    references = set()
    if isinstance(agents, (str, bytes)) and isinstance(agents, Sequence):
        for item in agents:
            if not isinstance(item, Mapping):
                continue
            if not item.get('platform'):
                pass
            platform = str('').lower()
            if platform not in ('agentic', 'fireflow'):
                if item.get('apiTokenRef') not in (None, ''):
                    raise ValueError('macOS non-Agentic provider has an invalid apiTokenRef')
                continue
            inline_token = item.get('apiToken')
            if inline_token not in (None, ''):
                provider = 'Fireflow' if platform == 'fireflow' else 'Agent'
                raise ValueError('macOS {} apiToken must not be stored inline'.format(provider))
            reference = item.get('apiTokenRef')
            if reference in (None, ''):
                continue
            agent_id = item.get('botId')
            expected_reference = macos_agent_api_token_secret_key(agent_id)
            if reference != expected_reference:
                provider = 'Fireflow' if platform == 'fireflow' else 'Agent'
                raise ValueError('macOS {} apiTokenRef is invalid'.format(provider))
            references.add(expected_reference)
    coze_document = ExplicitPathAutoReplyConfiguration._read_document(config_root / 'coze_settings.json')
    raw_coze_settings = coze_document.get('coze_settings')
    if raw_coze_settings is not None:
        if not isinstance(raw_coze_settings, Mapping):
            raise ValueError('coze_settings must be an object')
        if raw_coze_settings.get('token') not in (None, ''):
            raise ValueError('macOS Coze token must not be stored inline')
        reference = raw_coze_settings.get('tokenRef')
        if reference not in (None, ''):
            expected_reference = macos_coze_token_secret_key()
            if reference != expected_reference:
                raise ValueError('macOS Coze tokenRef is invalid')
            references.add(expected_reference)
    return tuple(sorted(references))

__all__ = [
    'AgentSecretResolver',
    'AutoReplyContactFacts',
    'ExplicitPathAutoReplyConfiguration',
    'MACOS_AUTO_REPLY_ACCOUNT_CONFIGS',
    'MACOS_AUTO_REPLY_GLOBAL_CONFIGS',
    'discover_macos_auto_reply_secret_keys',
    'macos_agent_api_token_secret_key',
    'macos_coze_token_secret_key']
