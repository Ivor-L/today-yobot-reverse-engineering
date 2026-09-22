# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: account_scope.marshal (Python 3.9)

from typing import Optional, Tuple
from uia_logger import UiaLogger
_logger = UiaLogger('AccountScope', **('logger_name',)).get_logger()

def resolve_active_account():
    '''返回当前活跃实例的 (account_id, nickname)；拿不到时返回 (None, None)。

    只读，不会切换活跃实例。
    '''
    pass
# WARNING: Decompyle incomplete


def warn_account_fallback(op = None):
    '''调用方未指定账号、即将回落到活跃实例时调用。

    返回落到的 account_id（仅供调用方记日志/回包用，**不要**用它去改变兜底逻辑——
    兜底本身仍由下游的 WeChat() 完成，这里重复解析一次只是为了把名字打进日志）。
    '''
    (account_id, nickname) = resolve_active_account()
    if account_id:
        if not nickname:
            pass
        _logger.warning(f'''[账号兜底] op={op} 未指定账号，回落到当前活跃实例 {'?'}({account_id})。多开场景下这可能不是用户想要的号。''')
    else:
        _logger.warning(f'''[账号兜底] op={op} 未指定账号，且当前没有可用的活跃实例。''')
    return account_id


def count_manageable_accounts():
    '''当前处于托管中（已初始化、未主动退出）的账号数。

    用于判断"是不是多开场景"——单号时兜底完全无害，多号时才值得提示。
    '''
    pass
# WARNING: Decompyle incomplete

