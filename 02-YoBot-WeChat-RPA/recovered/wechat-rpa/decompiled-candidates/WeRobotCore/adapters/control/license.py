# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: license.marshal (Python 3.9)

'''Mac I/O adaptation of the existing Windows legacy license wire contract.'''
import asyncio
from datetime import datetime

class LegacyLicenseTransport:
    
    def __init__(self, *, api_base):
        self.api_base = api_base.rstrip('/')

    
    async def _post(self, action, payload):
        
        def send():
            import requests
        # WARNING: Decompyle incomplete

        await asyncio.to_thread(send)
        return <NODE:28>

    
    async def activate(self, code, machine):
        await self._post('activate', {
            'activation_code': code,
            'machine_code': machine })
        return <NODE:28>

    
    async def unbind(self, code, machine):
        await self._post('unbind', {
            'activation_code': code,
            'machine_code': machine })
        return <NODE:28>

    
    async def verify(self, machine):
        
        def read():
            import requests
            SupabaseManager = SupabaseManager
            import WeRobotCore.utils.supabase_client
            configuration = SupabaseManager()
        # WARNING: Decompyle incomplete

        await asyncio.to_thread(read)
        return <NODE:28>


