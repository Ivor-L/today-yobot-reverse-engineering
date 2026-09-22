# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: session_identity.marshal (Python 3.9)

"""Platform-neutral conversation identity used inside shared workflows.

Windows Legacy currently exposes integer hashes while cross-platform drivers
use string identifiers.  Shared application caches must not inherit either
driver's native representation, so they use one canonical string key without
changing the compatibility payload passed to existing API and task consumers.
"""
from typing import Union
SessionIdInput = Union[(str, int)]

def normalize_session_key(session_id = None):
    '''Return the canonical in-process key for one conversation.

    Only the two representations used by the established Windows contract and
    the cross-platform domain are accepted.  In particular, booleans are
    rejected even though ``bool`` subclasses ``int`` because treating them as
    session identifiers would silently collide with ``0`` and ``1``.
    '''
    if isinstance(session_id, bool) or session_id is None:
        raise ValueError('session_id must be a non-empty string or integer')
    if not isinstance(session_id, (str, int)):
        raise TypeError('session_id must be a string or integer')
    key = str(session_id).strip()
    if not key:
        raise ValueError('session_id must be a non-empty string or integer')
    return key

