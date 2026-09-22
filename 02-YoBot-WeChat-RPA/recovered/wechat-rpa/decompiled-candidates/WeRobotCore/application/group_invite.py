# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: group_invite.marshal (Python 3.9)

'''Platform-neutral recognition rules for WeChat group invitation cards.'''
import re
from typing import Optional
_GROUP_INVITE_CARD_PATTERNS = (re.compile('邀请你加入群聊'), re.compile('进入可查看详情'))
_GROUP_INVITE_NAME_PATTERN = re.compile('邀请你加入群聊\\s*[“\\"\'](.+?)[”\\"\']')

def is_group_invite_card_text(text = None):
    '''Return whether text has the mature Windows invitation-card shape.'''
    if not text:
        pass
    value = ''.strip()
    if bool(value):
        pass
    return None((lambda .0 = None: for pattern in .0:
pattern.search(value))(_GROUP_INVITE_CARD_PATTERNS))


def extract_group_invite_name(text = None):
    '''Extract the final quoted group name from an invitation card.'''
    if not text:
        pass
    value = ''.strip()
    if not value:
        return None
    matches = None.findall(value)
    if matches:
        return matches[-1].strip()

__all__ = [
    'extract_group_invite_name',
    'is_group_invite_card_text']
