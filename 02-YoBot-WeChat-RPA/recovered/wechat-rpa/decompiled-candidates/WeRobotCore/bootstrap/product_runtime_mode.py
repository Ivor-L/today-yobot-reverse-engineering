# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: product_runtime_mode.marshal (Python 3.9)

'''Explicit process policy for publishing a Product Runtime candidate.'''
from enum import Enum
from typing import Optional
PRODUCT_RUNTIME_MODE_ENV = 'WEBOT_PRODUCT_RUNTIME_MODE'

class ProductRuntimeMode(Enum, str):
    '''Versionable modes accepted by the production composition root.

    Platform selection must never be inferred from the host operating system.
    The Windows candidate remains an opt-in integration-test mode until the
    later production migration gate is closed.
    '''
    DISABLED = 'disabled'
    WINDOWS_LEGACY_CANDIDATE = 'windows_legacy_candidate'


def resolve_product_runtime_mode(raw_value = None):
    '''Resolve an explicit mode while preserving the legacy default.

    A missing or blank value is deliberately equivalent to ``disabled``.
    Unknown values fail closed instead of silently selecting a platform.
    '''
    if raw_value is None:
        return ProductRuntimeMode.DISABLED
    if not None(raw_value, str):
        raise TypeError('product runtime mode must be a string or None')
    normalized = raw_value.strip()
    if normalized or normalized == ProductRuntimeMode.DISABLED.value:
        return ProductRuntimeMode.DISABLED
    if None == ProductRuntimeMode.WINDOWS_LEGACY_CANDIDATE.value:
        return ProductRuntimeMode.WINDOWS_LEGACY_CANDIDATE
    raise None('unsupported product runtime mode: {}'.format(normalized))

__all__ = [
    'PRODUCT_RUNTIME_MODE_ENV',
    'ProductRuntimeMode',
    'resolve_product_runtime_mode']
