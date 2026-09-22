# Original code-object fingerprint matched (line numbers excluded).
# Raw module path; package __init__ placement is not reconstructed.
# Source Generated with Decompyle++
# File: api.marshal (Python 3.9)

'''Legacy API modules, imported only when their operation is requested.'''
from importlib import import_module
__all__ = [
    'chat',
    'file',
    'friend',
    'guide']

def __getattr__(name):
    if name not in __all__:
        raise AttributeError('module {!r} has no attribute {!r}'.format(__name__, name))
    value = import_module('.{}'.format(name), __name__)
    globals()[name] = value
    return value


def __dir__():
    return sorted(set(globals()) | set(__all__))

