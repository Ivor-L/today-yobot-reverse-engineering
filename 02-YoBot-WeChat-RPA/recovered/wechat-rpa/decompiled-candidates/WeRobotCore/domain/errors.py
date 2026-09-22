# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: errors.marshal (Python 3.9)

'''Stable cross-platform error codes for driver and application boundaries.'''
from enum import Enum

class ErrorCode(Enum, str):
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
    '''Typed failure for read/lookup operations that cannot return a value.'''
    
    def __init__(self = None, code = None, message = None, retryable = None):
        if not isinstance(code, ErrorCode):
            raise TypeError('code must be an ErrorCode')
        super().__init__(message)
        self.code = code
        self.retryable = bool(retryable)

    __classcell__ = None

