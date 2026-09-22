"""Authorization semantics restored from the installed Python 3.9 bytecode.
Native/network verification remains injected, as in the original module.
"""
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional


@dataclass(frozen=True)
class ControlAccessDecision:
    allowed: bool
    status_code: int
    code: str
    message: str
    auth_type: Optional[str] = None

    def __post_init__(self):
        if not isinstance(self.allowed, bool):
            raise TypeError('allowed must be a boolean')
        if not isinstance(self.status_code, int) or isinstance(self.status_code, bool):
            raise TypeError('status_code must be an integer')
        if not isinstance(self.code, str):
            raise TypeError('code must be a string')
        if not isinstance(self.message, str):
            raise TypeError('message must be a string')
        if self.allowed:
            if self.status_code != 200:
                raise ValueError('an allowed decision must use status 200')
            if self.code or self.message:
                raise ValueError('an allowed decision must not carry an error')
            if not isinstance(self.auth_type, str) or not self.auth_type.strip():
                raise ValueError('an allowed decision requires auth_type')
        else:
            if not 400 <= self.status_code <= 599:
                raise ValueError('a denied decision must use an error status')
            if not isinstance(self.code, str) or not self.code.strip():
                raise ValueError('a denied decision requires code')
            if not isinstance(self.message, str) or not self.message.strip():
                raise ValueError('a denied decision requires message')
            if self.auth_type is not None:
                raise ValueError('a denied decision must not declare auth_type')

    @classmethod
    def granted(cls, auth_type: str):
        return cls(allowed=True, status_code=200, code='', message='', auth_type=auth_type)

    @classmethod
    def denied(cls, *, code: str, message: str, status_code: int = 403):
        return cls(allowed=False, status_code=status_code, code=code, message=message)


ControlAccessAuthorizer = Callable[[], Awaitable[ControlAccessDecision]]
ControlSeatVerifier = Callable[[], Awaitable[bool]]
ControlLegacyLicenseVerifier = Callable[[], Awaitable[bool]]


class ControlAccessDeniedError(RuntimeError):
    def __init__(self, decision: ControlAccessDecision):
        if not isinstance(decision, ControlAccessDecision):
            raise TypeError('decision must be a ControlAccessDecision')
        if decision.allowed:
            raise ValueError('an allowed decision cannot raise access denied')
        super().__init__(decision.message)
        self.decision = decision


async def require_control_access(authorizer: ControlAccessAuthorizer):
    if not callable(authorizer):
        raise TypeError('authorizer must be callable')
    try:
        decision = await authorizer()
    except ControlAccessDeniedError:
        raise
    except Exception:
        raise ControlAccessDeniedError(ControlAccessDecision.denied(
            code='RPA_ACCESS_CHECK_FAILED', message='RPA 运行授权检查失败', status_code=503
        )) from None
    if not isinstance(decision, ControlAccessDecision):
        raise ControlAccessDeniedError(ControlAccessDecision.denied(
            code='RPA_ACCESS_CHECK_FAILED', message='RPA 运行授权检查失败', status_code=503
        ))
    if not decision.allowed:
        raise ControlAccessDeniedError(decision)
    return decision


class LegacyCompatibleControlAccessAuthorizer:
    def __init__(self, *, backend_mode: bool, seat_verifier: Optional[ControlSeatVerifier],
                 legacy_license_verifier: ControlLegacyLicenseVerifier):
        if not isinstance(backend_mode, bool):
            raise TypeError('backend_mode must be a boolean')
        if seat_verifier is not None and not callable(seat_verifier):
            raise TypeError('seat_verifier must be callable or None')
        if backend_mode and seat_verifier is None:
            raise ValueError('seat_verifier is required in backend mode')
        if not callable(legacy_license_verifier):
            raise TypeError('legacy_license_verifier must be callable')
        self._backend_mode = backend_mode
        self._seat_verifier = seat_verifier
        self._legacy_license_verifier = legacy_license_verifier

    @staticmethod
    def _verified(value: object, owner: str):
        if not isinstance(value, bool):
            raise TypeError('{} must return a boolean'.format(owner))
        return value

    async def __call__(self):
        if self._backend_mode:
            try:
                assert self._seat_verifier is not None
                if self._verified(await self._seat_verifier(), 'seat_verifier'):
                    return ControlAccessDecision.granted('yoko_seat')
            except Exception:
                pass
        try:
            legacy_valid = self._verified(await self._legacy_license_verifier(), 'legacy_license_verifier')
        except Exception:
            return ControlAccessDecision.denied(code='LICENSE_CHECK_ERROR', message='授权验证服务异常', status_code=500)
        if legacy_valid:
            return ControlAccessDecision.granted('legacy_license')
        return ControlAccessDecision.denied(code='LICENSE_INVALID', message='软件未激活或授权已过期')


__all__ = ['ControlAccessAuthorizer', 'ControlAccessDecision', 'ControlAccessDeniedError',
           'ControlLegacyLicenseVerifier', 'ControlSeatVerifier',
           'LegacyCompatibleControlAccessAuthorizer', 'require_control_access']
