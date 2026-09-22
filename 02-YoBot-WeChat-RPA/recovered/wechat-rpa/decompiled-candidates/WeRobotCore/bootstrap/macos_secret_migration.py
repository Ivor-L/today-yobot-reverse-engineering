# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: macos_secret_migration.marshal (Python 3.9)

'''Explicit, rollback-safe migration of reviewed macOS plaintext secrets.

This module is composition support, not an automatic startup migration.  A
caller must supply a reviewed plaintext source and invoke one whitelisted key
at a time.  Windows DPAPI ciphertext is rejected because it cannot be safely
converted on macOS.
'''
import hmac
from typing import FrozenSet, Optional, Protocol
from WeRobotCore.domain import ErrorCode, OperationResult
from WeRobotCore.ports import SecretStore
MACOS_PLAINTEXT_SECRET_MIGRATION_KEYS: FrozenSet[str] = frozenset({
    'voice.doubao.api_key',
    'voice.doubao.access_token',
    'voice.doubao.secret_access_key'})

class MacPlaintextSecretSource(Protocol):
    '''Narrow access to an already reviewed legacy macOS config field.'''
    
    def read_plaintext_secret(self = None, key = None):
        pass

    
    def delete_plaintext_secret(self = None, key = None):
        pass



async def _rollback_keychain_copy(target = None, key = None):
    pass
# WARNING: Decompyle incomplete


async def migrate_macos_plaintext_secret(key = None, *, source, target, allowed_keys):
    '''Move one reviewed plaintext value into Keychain with rollback.

    The source is removed only after an exact Keychain readback.  If source
    deletion cannot be verified, the new Keychain copy is deleted again so a
    failed migration does not intentionally retain two copies.
    '''
    if isinstance(key, str) or key not in allowed_keys:
        return OperationResult.failed(ErrorCode.INVALID_ARGUMENT, 'macOS plaintext secret key is not in the reviewed migration whitelist')
    for method_name in None:
        if not callable(getattr(source, method_name, None)):
            return OperationResult.failed(ErrorCode.INVALID_ARGUMENT, 'macOS plaintext source does not implement the migration contract')
        if not isinstance(target, SecretStore):
            return OperationResult.failed(ErrorCode.INVALID_ARGUMENT, 'macOS migration target does not implement SecretStore')
        value = source.read_plaintext_secret(key)
# WARNING: Decompyle incomplete

__all__ = [
    'MACOS_PLAINTEXT_SECRET_MIGRATION_KEYS',
    'MacPlaintextSecretSource',
    'migrate_macos_plaintext_secret']
