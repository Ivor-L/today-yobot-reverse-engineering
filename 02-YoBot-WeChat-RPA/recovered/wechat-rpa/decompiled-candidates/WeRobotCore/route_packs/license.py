# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: license.marshal (Python 3.9)

'''Existing Windows license routes, without importing the Windows API host.'''
from fastapi import APIRouter, BackgroundTasks, Security
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse

class ActivationRequest(BaseModel):
    activation_code: str = Field(1, 256, **('min_length', 'max_length'))
    machine_code: str = Field('^[0-9A-F]{4}(?:-[0-9A-F]{4}){3}$', **('pattern',))


class UnbindRequest(BaseModel):
    activation_code: str = Field(1, 256, **('min_length', 'max_length'))


def create_license_router(*, service, auth_dependency, shutdown):
    router = APIRouter([
        Security(auth_dependency)], **('dependencies',))
    
    async def call(operation, *args):
        pass
    # WARNING: Decompyle incomplete

    
    async def info():
        await call(service.info)
        return <NODE:28>

    info = None(info)
    
    async def machine_code():
        return {
            'machine_code': service.machine_code }

    machine_code = None(machine_code)
    
    async def verify():
        await call(service.verify)
        return <NODE:28>

    verify = None(verify)
    
    async def activate(request = None):
        await call(service.activate, request.activation_code, request.machine_code)
        return <NODE:28>

    activate = None(activate)
    
    async def unbind(request = None, background = None):
        await call(service.unbind, request.activation_code)
        result = <NODE:28>
        if isinstance(result, dict) and result.get('success') is True:
            background.add_task(shutdown)
        return result

    unbind = None(unbind)
    return router

