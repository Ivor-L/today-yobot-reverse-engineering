# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_keychain.marshal (Python 3.9)

"""macOS Keychain implementation of the shared :class:`SecretStore` Port.

The adapter is safe to import on every platform.  PyObjC's Security bridge is
loaded only when a native operation is requested, so Windows packaging and
legacy startup do not gain a macOS dependency.

Secrets belong to the signed plugin control plane, not the RPA Helper.  New
items receive an explicit current-application ACL, stay on the current device,
and are queried with authentication UI disabled.  A caller that cannot satisfy
the Keychain ACL therefore fails closed instead of displaying an unexpected
system prompt or falling back to plaintext persistence.
"""
import hmac
import re
import sys
from typing import Any, Callable, Optional, Protocol
from WeRobotCore.domain import AutomationError, ErrorCode, OperationResult
MACOS_KEYCHAIN_SERVICE = 'com.yokowebot.secrets.v1'
_MAX_KEY_LENGTH = 128
_MAX_SERVICE_LENGTH = 255
_MAX_SECRET_BYTES = 65536
_VALID_KEY = re.compile('^[A-Za-z0-9][A-Za-z0-9._-]*$')

class MacKeychainBackendError(RuntimeError):
    '''Sanitized native Keychain failure that never contains secret material.'''
    
    def __init__(self = None, operation = None, status = None):
        self.operation = str(operation)
        self.status = None if status is None else int(status)
        suffix = '' if self.status is None else ' (OSStatus={})'.format(self.status)
        super().__init__('macOS Keychain {} failed{}'.format(self.operation, suffix))

    __classcell__ = None


class MacKeychainBackend(Protocol):
    '''Raw byte access owned by a macOS Keychain implementation.'''
    
    def read_secret(self = None, service = None, account = None):
        pass

    
    def write_secret(self = None, service = None, account = None, value = {
        'service': str,
        'account': str,
        'value': bytes,
        'return': None }):
        pass

    
    def delete_secret(self = None, service = None, account = None):
        pass



class MacSecurityKeychainBackend:
    '''Security.framework generic-password backend through lazy PyObjC.'''
    
    def __init__(self = None, security_loader = None, authentication_context_factory = None):
        if not security_loader:
            pass
        self._security_loader = self._load_security
        if not authentication_context_factory:
            pass
        self._authentication_context_factory = self._create_authentication_context

    
    def _load_security():
        if sys.platform != 'darwin':
            raise MacKeychainBackendError('is unavailable on this platform')
    # WARNING: Decompyle incomplete

    _load_security = staticmethod(_load_security)
    
    def _create_authentication_context():
        if sys.platform != 'darwin':
            raise MacKeychainBackendError('authentication is unavailable on this platform')
    # WARNING: Decompyle incomplete

    _create_authentication_context = staticmethod(_create_authentication_context)
    
    def _expect_success(security = None, operation = None, status = staticmethod):
        if int(status) != int(security.errSecSuccess):
            raise MacKeychainBackendError(operation, status)

    _expect_success = None(_expect_success)
    
    def _identity_query(self = None, security = None, service = None, account = {
        'security': Any,
        'service': str,
        'account': str }):
        return {
            security.kSecUseAuthenticationContext: self._authentication_context_factory(),
            security.kSecAttrSynchronizable: False,
            security.kSecAttrAccount: account,
            security.kSecAttrService: service,
            security.kSecClass: security.kSecClassGenericPassword }

    
    def _current_application_access(self = None, security = None):
        (trusted_status, trusted_application) = security.SecTrustedApplicationCreateFromPath(None, None)
        self._expect_success(security, 'could not bind the current application identity', trusted_status)
        (access_status, access) = security.SecAccessCreate('YokoWebot protected secret', [
            trusted_application], None)
        self._expect_success(security, 'could not create the application access policy', access_status)
        return access

    
    def read_secret(self = None, service = None, account = None):
        security = self._security_loader()
        query = self._identity_query(security, service, account)
        query.update({
            security.kSecMatchLimit: security.kSecMatchLimitOne,
            security.kSecReturnData: True })
        (status, result) = security.SecItemCopyMatching(query, None)
        if int(status) == int(security.errSecItemNotFound):
            return None
        None._expect_success(security, 'read', status)
    # WARNING: Decompyle incomplete

    
    def write_secret(self = None, service = None, account = None, value = {
        'service': str,
        'account': str,
        'value': bytes,
        'return': None }):
        security = self._security_loader()
        query = self._identity_query(security, service, account)
        update_status = security.SecItemUpdate(query, {
            security.kSecValueData: value })
        if int(update_status) == int(security.errSecSuccess):
            return None
        if None(update_status) != int(security.errSecItemNotFound):
            raise MacKeychainBackendError('update', update_status)
        access = self._current_application_access(security)
        attributes = dict(query)
        attributes.update({
            security.kSecValueData: value,
            security.kSecAttrAccess: access,
            security.kSecAttrAccessible: security.kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly })
        (add_status, _) = security.SecItemAdd(attributes, None)
        if int(add_status) == int(security.errSecDuplicateItem):
            retry_status = security.SecItemUpdate(query, {
                security.kSecValueData: value })
            self._expect_success(security, 'concurrent update', retry_status)
            return None
        None._expect_success(security, 'add', add_status)

    
    def delete_secret(self = None, service = None, account = None):
        security = self._security_loader()
        status = security.SecItemDelete(self._identity_query(security, service, account))
        if int(status) in (int(security.errSecSuccess), int(security.errSecItemNotFound)):
            return None
        raise None('delete', status)



class MacKeychainSecretStore:
    '''Verified UTF-8 facade over a product-scoped macOS Keychain service.'''
    
    def __init__(self = None, service_name = None, backend = None):
        if isinstance(service_name, str) and len(service_name) > _MAX_SERVICE_LENGTH or _VALID_KEY.fullmatch(service_name) is None:
            raise ValueError('service_name must use 1-255 safe ASCII namespace characters')
        if backend is None:
            backend = MacSecurityKeychainBackend()
        for method_name in ('read_secret', 'write_secret', 'delete_secret'):
            if not callable(getattr(backend, method_name, None)):
                raise TypeError('backend does not provide {}'.format(method_name))
        self._service_name = service_name
        self._backend = backend

    
    def _validate_key(key = None):
        if isinstance(key, str) and len(key) > _MAX_KEY_LENGTH or _VALID_KEY.fullmatch(key) is None:
            raise AutomationError(ErrorCode.INVALID_ARGUMENT, 'secret key must use 1-128 ASCII letters, digits, dot, underscore or dash')
        return key

    _validate_key = None(_validate_key)
    
    def _read_bytes(self = None, key = None):
        pass
    # WARNING: Decompyle incomplete

    
    async def get_secret(self = None, key = None):
        normalized_key = self._validate_key(key)
        value = self._read_bytes(normalized_key)
        if value is None:
            return None
        :
            normalized_key = self._validate_key(key)
            value = self._read_bytes(normalized_key)
            if value is None:
                return None
            
            return value.decode('utf-8', 'strict', **('errors',))
        return value.decode('utf-8', 'strict', **('errors',))
    # WARNING: Decompyle incomplete

    
    async def set_secret(self = None, key = None, value = None):
        pass
    # WARNING: Decompyle incomplete

    
    async def delete_secret(self = None, key = None):
        pass
    # WARNING: Decompyle incomplete


