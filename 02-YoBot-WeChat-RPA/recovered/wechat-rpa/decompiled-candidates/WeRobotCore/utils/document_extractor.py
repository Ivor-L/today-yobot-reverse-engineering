# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: document_extractor.marshal (Python 3.9)

import os
import logging
from typing import Optional

class DocumentExtractor:
    '''
    文档提取工具
    支持: txt, md, csv, pdf, docx
    '''
    
    def extract_text(file_path = None, max_length = None):
        if not os.path.exists(file_path):
            return None
        ext = None.path.splitext(file_path)[1].lower()
        text = ''
    # WARNING: Decompyle incomplete

    extract_text = None(extract_text)
    
    def _extract_text_plain(file_path = None):
        encodings = [
            'utf-8',
            'gbk',
            'gb18030',
            'utf-16']
    # WARNING: Decompyle incomplete

    _extract_text_plain = None(_extract_text_plain)
    
    def _extract_text_pdf(file_path = None):
        pass
    # WARNING: Decompyle incomplete

    _extract_text_pdf = None(_extract_text_pdf)
    
    def _extract_text_docx(file_path = None):
        pass
    # WARNING: Decompyle incomplete

    _extract_text_docx = None(_extract_text_docx)
    
    def _extract_text_excel(file_path = None):
        pass
    # WARNING: Decompyle incomplete

    _extract_text_excel = None(_extract_text_excel)

