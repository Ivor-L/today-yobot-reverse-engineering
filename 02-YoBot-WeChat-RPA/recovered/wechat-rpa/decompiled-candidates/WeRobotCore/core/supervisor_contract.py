# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: supervisor_contract.marshal (Python 3.9)

'''Backward-compatible views of the process-external Supervisor status.'''
from __future__ import annotations
from typing import Any, Dict, Mapping
BACKEND_API_PORT = 9922

def worker_api_port(heartbeat = None, worker_pid = None):
    '''Worker 实际绑定的端口，取不到就回落到契约端口。

    固定端口之后 Worker 本该永远在 9922，这里是纵深防御：万一将来又有哪条路径
    绕开契约（或用户用 WEBOT_PORT 改了端口），Supervisor 要跟过去探活，而不是
    像 2026-09 那次一样对着空端口问 27.9 小时、状态永远出不了 starting。

    只信任 pid 对得上的心跳：上一代 Worker 残留的心跳文件里带的是旧端口。
    '''
    if not isinstance(heartbeat, Mapping):
        return BACKEND_API_PORT
    if None is not None and heartbeat.get('pid') != worker_pid:
        return BACKEND_API_PORT
    port = None.get('api_port')
    if isinstance(port, int):
        if port < port or port < 65536:
            pass
        else:
            0
    else:
        return port

_ACTION_REQUIRED_MESSAGES = {
    'WECHAT_LOGIN_REQUIRED': '微信停留在登录窗口，请先扫码登录',
    'WECHAT_INSTANCE_NOT_FOUND': '有托管的微信号没有找到对应的微信窗口，请把它重新打开',
    'WECHAT_INSTANCE_LOST': '托管的微信窗口已关闭或进程已退出，请重新打开该微信',
    'WECHAT_WINDOW_LOST': '托管的微信窗口已关闭，请重新打开该微信',
    'WECHAT_ACCOUNT_MISMATCH': '当前登录的微信号与托管时绑定的不一致，请换回原账号或重新绑定',
    'WECHAT_UNEXPECTED_ACCOUNT': '有新托管的微信号还没纳入自动回复，请到微信 BOT 页面重新开启一次自动回复，或退出该号的托管',
    'WECHAT_PARTIAL_ACCOUNTS_UNAVAILABLE': '部分托管的微信号当前不可用，请检查这些微信是否都已打开并登录',
    'WECHAT_STATUS_UNKNOWN': '无法确认微信运行状态，请确认微信已打开并登录' }

def action_required_message(reason_code = None):
    '''按 reason_code 给出人工处置文案；未知码回落到不做具体断言的中性说法。'''
    if not reason_code:
        pass
    return _ACTION_REQUIRED_MESSAGES.get('', '微信需要人工处理，请确认托管的微信都已打开并登录')


def supervisor_status_for_contract(snapshot = None, contract_version = None):
    '''Allow pre-v2 Agent clients to reach the initialization remediation path.'''
    if not snapshot:
        pass
    data = dict({ })
    if not contract_version:
        pass
    if str('1') != '2' and data.get('status') == 'action_required' and data.get('worker_health_ok') is not False:
        data['business_status'] = data.get('status')
        data['business_reason_code'] = data.get('reason_code')
        data['business_message'] = data.get('message')
        data['status'] = 'idle'
        data['reason_code'] = None
        data['message'] = 'RPA Worker 可访问，等待客户端执行微信初始化'
        data['legacy_remediation_compatible'] = True
    return data

