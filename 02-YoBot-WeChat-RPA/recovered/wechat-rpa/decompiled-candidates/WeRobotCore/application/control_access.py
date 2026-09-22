# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_access.marshal (Python 3.9)

'''Platform-neutral authorization result for local Control routes.'''
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional
ControlAccessDecision = dataclass(True, **('frozen',))(<NODE:12>)
ControlAccessAuthorizer = Callable[([], Awaitable[ControlAccessDecision])]
ControlSeatVerifier = Callable[([], Awaitable[bool])]
ControlLegacyLicenseVerifier = Callable[([], Awaitable[bool])]

class ControlAccessDeniedError(RuntimeError):
    '''Sanitized fail-closed result for task and native-action boundaries.'''
    
    def __init__(self = None, decision = None):
        if not isinstance(decision, ControlAccessDecision):
            raise TypeError('decision must be a ControlAccessDecision')
        if decision.allowed:
            raise ValueError('an allowed decision cannot raise access denied')
        super().__init__(decision.message)
        self.decision = decision

    __classcell__ = None


async def require_control_access(authorizer = None):
    '''Require one sanitized snapshot without leaking authorizer failures.'''
    if not callable(authorizer):
        raise TypeError('authorizer must be callable')
# WARNING: Decompyle incomplete


class LegacyCompatibleControlAccessAuthorizer:
    '''Preserve the mature Agent-seat then legacy-license fallback order.

    Native machine-code, network, cache and license-file work remains behind
    the injected verifiers.  In Agent mode, seat verification failures fall
    through to the legacy verifier exactly like the current middleware.  A
    legacy verifier failure is closed as ``LICENSE_CHECK_ERROR``.
    '''
    
    def __init__(self = None, *, backend_mode, seat_verifier, legacy_license_verifier):
        if not isinstance(backend_mode, bool):
            raise TypeError('backend_mode must be a boolean')
        if not seat_verifier is not None and callable(seat_verifier):
            raise TypeError('seat_verifier must be callable or None')
        if backend_mode and seat_verifier is None:
            raise ValueError('seat_verifier is required in backend mode')
        if not callable(legacy_license_verifier):
            raise TypeError('legacy_license_verifier must be callable')
        self._backend_mode = backend_mode
        self._seat_verifier = seat_verifier
        self._legacy_license_verifier = legacy_license_verifier

    
    def _verified(value = None, owner = None):
        if not isinstance(value, bool):
            raise TypeError('{} must return a boolean'.format(owner))
        return value

    _verified = None(_verified)
    
    async def __call__(self = None):
        pass
    # WARNING: Decompyle incomplete


__all__ = [
    'ControlAccessAuthorizer',
    'ControlAccessDecision',
    'ControlAccessDeniedError',
    'ControlLegacyLicenseVerifier',
    'ControlSeatVerifier',
    'LegacyCompatibleControlAccessAuthorizer',
    'require_control_access']
