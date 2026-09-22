# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: instance_command_compatibility.marshal (Python 3.9)

'''Pure Legacy HTTP projections for shared instance command outcomes.'''
from dataclasses import dataclass
from typing import Any, Mapping, Optional
from WeRobotCore.application.instances import InstanceExitOutcome, InstanceSwitchOutcome
from WeRobotCore.domain import ErrorCode
WindowsLegacyInstanceCommandProjection = dataclass(True, **('frozen',))(<NODE:12>)

def project_windows_legacy_exit(outcome = None):
    if not isinstance(outcome, InstanceExitOutcome):
        raise TypeError('outcome must be an InstanceExitOutcome')
    result = outcome.result
    if result.success:
        return WindowsLegacyInstanceCommandProjection(200, {
            'success': True,
            'message': '已退出托管，该实例将不再执行自动化任务' }, **('status_code', 'payload'))
    if None.code is ErrorCode.INSTANCE_NOT_FOUND:
        return WindowsLegacyInstanceCommandProjection(404, '未找到指定实例', **('status_code', 'error_detail'))
    if not None.message:
        pass
    detail = '实例退出命令失败'
    return WindowsLegacyInstanceCommandProjection(500, '退出托管失败: {}'.format(detail), **('status_code', 'error_detail'))


def project_windows_legacy_switch(outcome = None):
    if not isinstance(outcome, InstanceSwitchOutcome):
        raise TypeError('outcome must be an InstanceSwitchOutcome')
    result = outcome.result
    if not result.success:
        if not result.message:
            pass
        detail = '实例切换命令失败'
        return WindowsLegacyInstanceCommandProjection(500, '切换实例失败: {}'.format(detail), **('status_code', 'error_detail'))
    if None.counts is None:
        raise ValueError('successful switch outcome omitted contact counts')
    return WindowsLegacyInstanceCommandProjection(200, {
        'success': True,
        'message': '切换实例成功',
        'instance': {
            'instance_id': result.instance_id.value,
            'nickname': result.nickname,
            'account_id': result.account_id,
            'friend_count': outcome.counts.friend_count,
            'group_count': outcome.counts.group_count } }, **('status_code', 'payload'))

