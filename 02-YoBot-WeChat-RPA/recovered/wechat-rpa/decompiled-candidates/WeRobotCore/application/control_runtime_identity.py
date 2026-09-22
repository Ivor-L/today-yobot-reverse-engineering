# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: control_runtime_identity.marshal (Python 3.9)

'''Immutable identity for one Agent-managed Control process.'''
from __future__ import annotations
from dataclasses import dataclass
import re
from typing import Any, Dict
_RUNTIME_ID = re.compile('^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.IGNORECASE)
ControlRuntimeIdentity = dataclass(True, **('frozen',))(<NODE:12>)
__all__ = [
    'ControlRuntimeIdentity']
