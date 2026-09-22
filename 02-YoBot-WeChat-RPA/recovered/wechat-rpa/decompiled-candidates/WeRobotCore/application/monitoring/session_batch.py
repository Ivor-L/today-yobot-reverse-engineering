# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: session_batch.marshal (Python 3.9)

'''Normalized monitor input with an explicit Legacy compatibility projection.

The monitor migration needs both representations for a limited transition:
shared decisions can consume :class:`SessionSummary`, while unchanged task and
WebSocket consumers can continue receiving the established Legacy fields.
Keeping the compatibility payload here prevents either representation from
being reconstructed later from incomplete data.
'''
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Any, Mapping, Tuple
from WeRobotCore.domain import SessionSummary
MonitorSessionItem = dataclass(True, **('frozen',))(<NODE:12>)
MonitorSessionBatch = dataclass(True, **('frozen',))(<NODE:12>)
