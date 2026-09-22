"""OperationResult restored from the installed Python 3.9 bytecode."""
from dataclasses import dataclass, field
from typing import Any, Mapping, Optional
from ..errors import ErrorCode


@dataclass(frozen=True)
class OperationResult:
    success: bool
    code: ErrorCode
    message: str = ''
    verified: bool = False
    retryable: bool = False
    data: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self):
        if not isinstance(self.code, ErrorCode):
            raise TypeError('code must be an ErrorCode')
        if self.success and self.code is not ErrorCode.OK:
            raise ValueError('successful results must use ErrorCode.OK')
        if not self.success and self.code is ErrorCode.OK:
            raise ValueError('failed results cannot use ErrorCode.OK')

    @classmethod
    def succeeded(cls, message: str = '', verified: bool = False, data: Optional[Mapping[str, Any]] = None):
        return cls(success=True, code=ErrorCode.OK, message=message,
                   verified=verified, retryable=False, data=data or {})

    @classmethod
    def failed(cls, code: ErrorCode, message: str, retryable: bool = False,
               data: Optional[Mapping[str, Any]] = None):
        return cls(success=False, code=code, message=message,
                   verified=False, retryable=retryable, data=data or {})
