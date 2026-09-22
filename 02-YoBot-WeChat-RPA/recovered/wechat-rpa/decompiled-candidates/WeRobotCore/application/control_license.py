# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_license.marshal (Python 3.9)

'''Windows-compatible license operations over explicit platform I/O ports.

Stored metadata is never an offline authorization credential. Only an online
verification (or its existing 30 minute cache) can authorize execution.
'''
import asyncio
from datetime import datetime
import json
import time
from control_access import ControlAccessDecision

class ControlLicenseService:
    
    def __init__(self = None, *, machine_code, transport, secret_store, seat_verifier, clock):
        self.machine_code = machine_code
        self.transport = transport
        self.secret_store = secret_store
        self.seat_verifier = seat_verifier
        self.clock = clock
        self._cached = None
        self._expires = 0
        self._lock = None
        self.revoked = False
        self.secret_key = 'rpa.legacy-license.' + machine_code

    
    def _operation_lock(self):
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    
    async def info(self):
        return {
            'success': True,
            'data': {
                'machine_code': self.machine_code } }

    
    async def verify_legacy(self):
        if self.revoked:
            return {
                'valid': False,
                'message': '授权已解绑' }
        await None.transport.verify(self.machine_code)
        result = <NODE:28>
        if not isinstance(result, dict) or isinstance(result.get('valid'), bool):
            raise ValueError('invalid legacy verification response')
        return result

    
    async def check_legacy(self):
        pass
    # WARNING: Decompyle incomplete

    
    async def verify(self):
        pass
    # WARNING: Decompyle incomplete

    
    async def activate(self, activation_code, machine_code):
        if machine_code != self.machine_code:
            return {
                'valid': False,
                'message': '机器码与当前设备不一致' }
    # WARNING: Decompyle incomplete

    
    async def unbind(self, activation_code):
        pass
    # WARNING: Decompyle incomplete

    
    def guard(self, authorizer):
        
        async def authorize():
            if self.revoked:
                return ControlAccessDecision.denied('LICENSE_INVALID', '授权已解绑', **('code', 'message'))
            await None()
            decision = <NODE:28>
            if self.revoked:
                return ControlAccessDecision.denied('LICENSE_INVALID', '授权已解绑', **('code', 'message'))

        return authorize


