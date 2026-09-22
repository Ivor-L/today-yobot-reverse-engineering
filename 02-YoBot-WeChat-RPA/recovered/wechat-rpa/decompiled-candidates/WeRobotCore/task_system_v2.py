# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: task_system_v2.marshal (Python 3.9)

'''Task System V2 compatibility exports.

Importing the package must not construct or import a platform RPA client.
Windows callers can keep importing ``AutoFollowTask`` from this package; the
task module is loaded only when that specific attribute is requested.
'''
from importlib import import_module
from base import TaskPriority, TaskStatus, TaskType
__all__ = [
    'TaskType',
    'TaskPriority',
    'TaskStatus',
    'AutoFollowTask']
_LAZY_EXPORTS = {
    'AutoFollowTask': ('.tasks.auto_follow_task', 'AutoFollowTask') }

def __getattr__(name):
    target = _LAZY_EXPORTS.get(name)
    if target is None:
        raise AttributeError('module {!r} has no attribute {!r}'.format(__name__, name))
    (module_name, attribute_name) = target
    value = getattr(import_module(module_name, __name__), attribute_name)
    globals()[name] = value
    return value


def __dir__():
    return sorted(set(globals()) | set(__all__))

