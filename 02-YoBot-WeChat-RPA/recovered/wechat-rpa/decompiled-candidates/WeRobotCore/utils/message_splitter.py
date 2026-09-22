# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: message_splitter.marshal (Python 3.9)

import re
from typing import List, Optional
AUTO_SPLIT_NONE = 'none'
AUTO_SPLIT_DOUBLE_NEWLINE = 'double_newline'
AUTO_SPLIT_TRIPLE_NEWLINE = 'triple_newline'
DEFAULT_AUTO_SPLIT_MODE = AUTO_SPLIT_DOUBLE_NEWLINE
_VALID_MODES = {
    AUTO_SPLIT_NONE,
    AUTO_SPLIT_DOUBLE_NEWLINE,
    AUTO_SPLIT_TRIPLE_NEWLINE}

def normalize_auto_split_mode(mode = None):
    if mode in _VALID_MODES:
        return mode


def split_text_message(message = None, mode = None):
    '''Split an AI text reply according to the configured newline threshold.'''
    if not message:
        pass
    text = str('').replace('\r\n', '\n').replace('\r', '\n')
    normalized_mode = normalize_auto_split_mode(mode)
    if normalized_mode == AUTO_SPLIT_NONE:
        stripped = text.strip()
        if stripped:
            return [
                stripped]
        return None
    newline_count = 3 if None == AUTO_SPLIT_TRIPLE_NEWLINE else 2
    messages = re.split(f'''\\n{{{newline_count},}}''', text)
    return (lambda .0: [ item.strip() for item in .0 if item.strip() ])(messages)

