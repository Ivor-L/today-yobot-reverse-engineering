"""Restored from Python 3.9 bytecode; see analysis/还原进展.md."""
from enum import Enum

class ErrorCode(str, Enum):
    '''Errors that application services may handle without inspecting a driver.'''
    OK = 'OK'
    INVALID_ARGUMENT = 'INVALID_ARGUMENT'
    INSTANCE_NOT_FOUND = 'INSTANCE_NOT_FOUND'
    INSTANCE_NOT_READY = 'INSTANCE_NOT_READY'
    ACCOUNT_NOT_INITIALIZED = 'ACCOUNT_NOT_INITIALIZED'
    CAPABILITY_UNAVAILABLE = 'CAPABILITY_UNAVAILABLE'
    PERMISSION_REQUIRED = 'PERMISSION_REQUIRED'
    CONFIRMATION_REQUIRED = 'CONFIRMATION_REQUIRED'
    CLIENT_VERSION_UNSUPPORTED = 'CLIENT_VERSION_UNSUPPORTED'
    ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND'
    WINDOW_OCCLUDED = 'WINDOW_OCCLUDED'
    CONVERSATION_CHANGED = 'CONVERSATION_CHANGED'
    ACTION_NOT_VERIFIED = 'ACTION_NOT_VERIFIED'
    OPERATION_TIMEOUT = 'OPERATION_TIMEOUT'
    RATE_LIMITED = 'RATE_LIMITED'
    OPERATION_FAILED = 'OPERATION_FAILED'


class AutomationError(RuntimeError):
    def __init__(self, code: ErrorCode, message: str, retryable: bool = False):
        if not isinstance(code, ErrorCode):
            raise TypeError('code must be an ErrorCode')
        super().__init__(message)
        self.code = code
        self.retryable = bool(retryable)
