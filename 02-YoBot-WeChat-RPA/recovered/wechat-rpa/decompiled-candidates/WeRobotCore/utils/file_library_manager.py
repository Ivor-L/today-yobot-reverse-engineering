# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: file_library_manager.marshal (Python 3.9)

import os
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
from data_manager import DataManager

class FileLibraryManager:
    '''本地文件库管理器，管理用户预置的可发送文件'''
    
    def __init__(self):
        self.library_dir = DataManager.get_data_dir() / 'file_library'
        self.files_dir = self.library_dir / 'files'
        self.index_path = self.library_dir / 'index.json'
        self._ensure_dirs()

    
    def _ensure_dirs(self):
        self.library_dir.mkdir(True, True, **('parents', 'exist_ok'))
        self.files_dir.mkdir(True, True, **('parents', 'exist_ok'))

    
    def _load_index(self = None):
        if not self.index_path.exists():
            return {
                'files': [] }
        :
            if not self.index_path.exists():
                return {
                    'files': [] }
            
            return json.loads(self.index_path.read_text('utf-8', **('encoding',)))
        return json.loads(self.index_path.read_text('utf-8', **('encoding',)))
    # WARNING: Decompyle incomplete

    
    def _save_index(self = None, index = None):
        self.index_path.write_text(json.dumps(index, False, 2, **('ensure_ascii', 'indent')), 'utf-8', **('encoding',))

    
    def get_all_files(self = None):
        '''获取所有文件列表，附带文件实际存在状态'''
        index = self._load_index()
        result = []
        for f in index.get('files', []):
            stored_path = self.library_dir / f['stored_path']
            entry = dict(f)
            entry['exists'] = stored_path.exists()
            result.append(entry)
        return result

    
    def key_exists(self = None, key = None):
        index = self._load_index()
        return None((lambda .0 = None: for f in .0:
f['key'] == key)(index.get('files', [])))

    
    def add_file(self = None, key = None, filename = None, content = ('',), description = {
        'key': str,
        'filename': str,
        'content': bytes,
        'description': str,
        'return': Dict }):
        '''上传文件到文件库，key必须唯一。文件存储在以哈希命名的子目录中，原始文件名保留。'''
        key = key.strip()
        if not key:
            raise ValueError('标识Key不能为空')
        if self.key_exists(key):
            raise ValueError(f'''标识 \'{key}\' 已存在，请换一个''')
        file_hash = hashlib.md5(content).hexdigest()[:12]
        sub_dir = self.files_dir / file_hash
        counter = 1
        if sub_dir.exists():
            sub_dir = self.files_dir / f'''{file_hash}_{counter}'''
            counter += 1
            continue
        sub_dir.mkdir(True, **('parents',))
        file_path = sub_dir / filename
        file_path.write_bytes(content)
        size_mb = round(len(content) / 1048576, 2)
        entry = {
            'key': key,
            'filename': filename,
            'stored_path': f'''files/{sub_dir.name}/{filename}''',
            'size_mb': size_mb,
            'upload_time': datetime.now().isoformat(),
            'description': description }
        index = self._load_index()
        index['files'].append(entry)
        self._save_index(index)
        return entry

    
    def delete_file(self = None, key = None):
        '''删除文件库中的文件及其子目录'''
        index = self._load_index()
        files = index.get('files', [])
        target = None((lambda .0 = None: 