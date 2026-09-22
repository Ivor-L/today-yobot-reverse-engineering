# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: auto_follow.marshal (Python 3.9)

'''Platform-neutral automatic follow-up workflow.

The AI service graph stays lazy so composing the signed Control process does
not import network clients or inspect the host environment.
'''
from runtime import AutoFollowRuntime

def __getattr__(name):
    if name == 'AutoFollowWorkflow':
        AutoFollowWorkflow = AutoFollowWorkflow
        import workflow
        return AutoFollowWorkflow
    raise None(name)

__all__ = [
    'AutoFollowRuntime',
    'AutoFollowWorkflow']
