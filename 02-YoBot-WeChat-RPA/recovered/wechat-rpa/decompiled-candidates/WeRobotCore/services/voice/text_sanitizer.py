# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: text_sanitizer.marshal (Python 3.9)

'''
TTS 文本净化：把不该被语音播报的 Markdown / URL / HTML 标记剥掉，
但保留所有有效字符内容（包括中英文、标点、emoji、代码字面量等）。

设计原则：
- 只删格式符号（** ` # > * -...），不删有效字符；
- 裸 URL 由于无法被自然朗读，整段移除；
- 链接保留锚文本；图片整段删除；
- 嵌套顺序很重要：先粗体后斜体，避免 ** 被当作 * 嵌套吃掉。
'''
from __future__ import annotations
import re
_RE_CODE_FENCE = re.compile('```(?:[\\w+\\-]*\\n)?(.*?)```', re.DOTALL)
_RE_TABLE_SEP = re.compile('^\\s*\\|?\\s*:?-{2,}:?\\s*(\\|\\s*:?-{2,}:?\\s*)+\\|?\\s*$', re.MULTILINE)
_RE_HR = re.compile('^\\s*(?:[-*_]\\s*){3,}\\s*$', re.MULTILINE)
_RE_HEADING = re.compile('^\\s*#{1,6}\\s+', re.MULTILINE)
_RE_LIST_MARK = re.compile('^\\s*(?:[-*+]|\\d+[.)])\\s+', re.MULTILINE)
_RE_QUOTE_MARK = re.compile('^\\s*>+\\s?', re.MULTILINE)
_RE_IMAGE = re.compile('!\\[[^\\]]*\\]\\([^)]*\\)')
_RE_LINK = re.compile('\\[([^\\]]+)\\]\\([^)]*\\)')
_RE_REF_LINK = re.compile('\\[([^\\]]+)\\]\\[[^\\]]*\\]')
_RE_INLINE_CODE = re.compile('`+([^`\\n]+?)`+')
_RE_BOLD_AST = re.compile('\\*\\*([^*\\n]+?)\\*\\*')
_RE_BOLD_UND = re.compile('__([^_\\n]+?)__')
_RE_ITAL_AST = re.compile('(?<![*\\w])\\*([^*\\n]+?)\\*(?![*\\w])')
_RE_ITAL_UND = re.compile('(?<![_\\w])_([^_\\n]+?)_(?![_\\w])')
_RE_STRIKE = re.compile('~~([^~\\n]+?)~~')
_RE_HTML = re.compile('<[^>\\n]{1,200}>')
_RE_URL = re.compile('https?://[^\\s<>"\\\']+')
_RE_TABLE_PIPE = re.compile('[ \\t]*\\|[ \\t]*')
_RE_MULTI_NL = re.compile('\\n{3,}')
_RE_MULTI_SPACE = re.compile('[ \\t]{2,}')
_RE_TRAILING_PUNCT = re.compile('^[ \\t\\-*_=>|`]+|[ \\t\\-*_=>|`]+$', re.MULTILINE)
_RE_DETECT_HTTP = re.compile('https?://[^\\s<>"\\\']+', re.IGNORECASE)
_RE_DETECT_WWW = re.compile('\\bwww\\.[\\w\\-]+\\.[a-z]{2,}', re.IGNORECASE)

def contains_actionable_url(text = None):
    '''
    检测文本中是否包含"可点击型"链接（http(s):// 或 www. 域名）。

    用途：AI 回复里若有链接，应跳过语音直接走文本——语音消息无法承载可点击 URL，
    把链接净化掉后用户会拿不到关键信息。
    '''
    if not text or isinstance(text, str):
        return False
    if not _RE_DETECT_HTTP.search(text):
        pass
    return None(_RE_DETECT_WWW.search(text))


def sanitize_for_tts(text = None):
    '''剥离 Markdown / HTML / URL 等格式符号，保留可朗读的有效文字。'''
    if not text or isinstance(text, str):
        return ''
    s = None
    s = _RE_CODE_FENCE.sub((lambda m: m.group(1)), s)
    s = _RE_TABLE_SEP.sub('', s)
    s = _RE_HR.sub('', s)
    s = _RE_HEADING.sub('', s)
    s = _RE_LIST_MARK.sub('', s)
    s = _RE_QUOTE_MARK.sub('', s)
    s = _RE_IMAGE.sub('', s)
    s = _RE_LINK.sub('\\1', s)
    s = _RE_REF_LINK.sub('\\1', s)
    s = _RE_INLINE_CODE.sub('\\1', s)
    s = _RE_BOLD_AST.sub('\\1', s)
    s = _RE_BOLD_UND.sub('\\1', s)
    s = _RE_ITAL_AST.sub('\\1', s)
    s = _RE_ITAL_UND.sub('\\1', s)
    s = _RE_STRIKE.sub('\\1', s)
    s = _RE_HTML.sub('', s)
    s = _RE_URL.sub('', s)
    s = _RE_TABLE_PIPE.sub(' ', s)
    s = _RE_MULTI_NL.sub('\n\n', s)
    s = _RE_MULTI_SPACE.sub(' ', s)
    s = _RE_TRAILING_PUNCT.sub('', s)
    return s.strip()

