# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: message_processor.marshal (Python 3.9)

import os
import re
from dataclasses import dataclass
from typing import List, Optional
MessageComponent = dataclass(<NODE:12>)
ParsedMessage = dataclass(<NODE:12>)

class MessageProcessor:
    MAX_FORWARD_TARGET_LENGTH = 128
    
    def __init__(self):
        self.MESSAGE_TYPES = {
            'TEXT': 'text',
            'IMAGE': 'image',
            'MIXED': 'mixed',
            'FILE': 'file',
            'LOCAL_FILE': 'local_file',
            'RHETORIC_GROUP': 'rhetoric_group',
            'WXPAY_QR': 'wxpay_qr',
            'FORWARD_MESSAGE': 'forward_message' }
        self._forward_message_pattern = re.compile('^\\s*\\[forward_message_to:([^\\]\\r\\n]+)\\]\\s*$', re.IGNORECASE)
        self._forward_message_marker = re.compile('\\[\\s*forward_message_to\\s*:', re.IGNORECASE)
        self._combined_pattern = re.compile('(?:(\\[send_group:([^\\]]+)\\])|(\\[send_file:([^\\]]+)\\])|(!\\[[^\\]]*?\\]\\((weixin://wxpay/bizpayurl\\?pr=[a-zA-Z0-9]+[^)]*)\\))|(!\\[[^\\]]*?\\]\\((?!weixin://wxpay)([^)]+?)\\))|(data:image/[^;]+;base64,[A-Za-z0-9+/=]+)|(https?://[^\\s<>"\\[\\]{}|\\\\^`]+)|((?:[A-Za-z]:[\\\\/]|\\\\\\\\[^\\s\\\\/]+[\\\\/])[^\\s<>"|?*\\r\\n，。；：！？（）【】《》“”]+|(?m:^[ \\t]*/[^\\r\\n<>"|?*]+)))', re.IGNORECASE)
        self.LOCAL_FILE_EXTENSIONS = {
            '.xlsx',
            '.txt',
            '.jpg',
            '.mov',
            '.webp',
            '.csv',
            '.zip',
            '.m4a',
            '.rtf',
            '.docx',
            '.mp3',
            '.png',
            '.ppt',
            '.md',
            '.wav',
            '.xls',
            '.pdf',
            '.doc',
            '.gif',
            '.pptx',
            '.jpeg',
            '.mp4',
            '.7z',
            '.bmp',
            '.rar'}

    
    def parse_message(self = None, content = None):
        if not content:
            pass
        content = str('')
        forward_target = self.parse_forward_message_target(content)
        if forward_target is not None:
            return ParsedMessage(self.MESSAGE_TYPES['FORWARD_MESSAGE'], [
                MessageComponent(self.MESSAGE_TYPES['FORWARD_MESSAGE'], forward_target, **('type', 'content'))], **('type', 'components'))
        components = None
        text_buffer = ''
        last_index = 0
        for match in self._combined_pattern.finditer(content):
            text_before = content[last_index:match.start()]
            if text_before:
                text_buffer += text_before
            g = match.groups()
            if g[0]:
                group_name = g[1].strip()
                if text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(self.MESSAGE_TYPES['RHETORIC_GROUP'], group_name, **('type', 'content')))
            elif g[2]:
                key = g[3].strip()
                if text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(self.MESSAGE_TYPES['LOCAL_FILE'], key, **('type', 'content')))
            elif g[4] and g[5]:
                if text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(self.MESSAGE_TYPES['WXPAY_QR'], g[5], **('type', 'content')))
            elif g[6] and g[7]:
                url = g[7]
                component_type = self._determine_url_type(url)
                if component_type == self.MESSAGE_TYPES['TEXT']:
                    text_buffer += match.group(0)
                elif text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(component_type, url, **('type', 'content')))
            elif g[8]:
                if text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(self.MESSAGE_TYPES['IMAGE'], g[8], **('type', 'content')))
            elif g[9]:
                url = g[9]
                component_type = self._determine_url_type(url)
                if component_type == self.MESSAGE_TYPES['TEXT']:
                    text_buffer += match.group(0)
                elif text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                components.append(MessageComponent(component_type, url, **('type', 'content')))
            elif g[10]:
                local_path = self._resolve_local_path(g[10])
                if local_path is None:
                    text_buffer += match.group(0)
                elif text_buffer:
                    components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
                    text_buffer = ''
                component_type = self.MESSAGE_TYPES['IMAGE'] if self._check_file_extension(local_path) == self.MESSAGE_TYPES['IMAGE'] else self.MESSAGE_TYPES['FILE']
                components.append(MessageComponent(component_type, local_path, **('type', 'content')))
            last_index = match.end()
        remaining = content[last_index:]
        if remaining:
            text_buffer += remaining
        if text_buffer:
            components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], text_buffer, **('type', 'content')))
        if not components:
            components.append(MessageComponent(self.MESSAGE_TYPES['TEXT'], content, **('type', 'content')))
        return ParsedMessage(self.MESSAGE_TYPES['MIXED'] if len(components) > 1 else components[0].type, components, **('type', 'components'))

    
    def contains_forward_message_directive(self = None, content = None):
        '''回复中是否出现转发指令头；包含格式错误或混合文本的情况。'''
        if not content:
            pass
        return bool(self._forward_message_marker.search(str('')))

    
    def parse_forward_message_target(self = None, content = None):
        '''解析独占整条回复的转发目标；格式不合法时返回 ``None``。'''
        if not content:
            pass
        match = self._forward_message_pattern.fullmatch(str(''))
        if not match:
            return None
        target = None.group(1).strip()
        if target or len(target) > self.MAX_FORWARD_TARGET_LENGTH:
            return None

    
    def _resolve_local_path(self = None, raw = None):
        '''校验本地绝对路径：文件真实存在且后缀在白名单内才返回规范化路径，否则返回None

        AI 回复里的路径常常紧跟标点（如"C:\\a\\b.docx，你打开看看"），
        因此从右往左逐个剥离结尾的标点/引号重试，取第一个真实存在的路径。
        '''
        candidate = raw.strip().strip('"\'“”')
        trailing = '.,;:!?)]}>"\'）】》。，、；：！？'
    # WARNING: Decompyle incomplete

    
    def _determine_url_type(self = None, url = None):
        '''判断URL类型（图片、文件或文本）
        
        使用多层策略进行URL类型识别：
        1. 文件扩展名检查（快速、可靠）
        2. HTTP HEAD请求获取MIME类型（准确、权威）
        3. 备选方案处理
        '''
        extension_type = self._check_file_extension(url)
        if extension_type != self.MESSAGE_TYPES['TEXT']:
            return extension_type
        mime_type = None._get_mime_type_from_url(url)
        if mime_type:
            return self._mime_type_to_message_type(mime_type)
        return None._fallback_url_detection(url)

    
    def _check_file_extension(self = None, url = None):
        '''检查文件扩展名'''
        if re.search('\\.(jpg|jpeg|png|gif|webp|bmp|svg|ico|tiff?)(?:[^)\\s]*?)$', url, re.IGNORECASE):
            return self.MESSAGE_TYPES['IMAGE']
        if None.search('\\.(pdf|docx?|xlsx?|pptx?|txt|rtf|odt|ods|odp)(?:[^)\\s]*?)$', url, re.IGNORECASE):
            return self.MESSAGE_TYPES['FILE']
        return None.MESSAGE_TYPES['TEXT']

    
    def _get_mime_type_from_url(self = None, url = None):
        '''通过HTTP HEAD请求获取MIME类型'''
        pass
    # WARNING: Decompyle incomplete

    
    def _mime_type_to_message_type(self = None, mime_type = None):
