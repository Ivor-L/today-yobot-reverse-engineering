# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: crypto_utils.marshal (Python 3.9)

from cryptography.fernet import Fernet
import base64
import os
from pathlib import Path
import json

class CryptoManager:
    
    def __init__(self):
        self.key_file = Path.home() / '.yokowebot' / '.key'
        self._key = self._load_or_create_key()
        self._fernet = Fernet(self._key)

    
    def _load_or_create_key(self = None):
        '''加载或创建加密密钥'''
        if self.key_file.exists():
            return self.key_file.read_bytes()
        key = None.generate_key()
        self.key_file.parent.mkdir(True, True, **('parents', 'exist_ok'))
        self.key_file.write_bytes(key)
        return key

    
    def encrypt_dict(self = None, data = None):
        '''加密字典数据'''
        json_str = json.dumps(data)
        encrypted_data = self._fernet.encrypt(json_str.encode())
        return base64.b64encode(encrypted_data).decode()

    
    def decrypt_dict(self = None, encrypted_str = None):
        '''解密字典数据'''
        pass
    # WARNING: Decompyle incomplete

    
    def encrypt_text(self = None, text = None):
        '''加密文本数据'''
        encrypted_data = self._fernet.encrypt(text.encode())
        return base64.b64encode(encrypted_data).decode()

    
    def decrypt_text(self = None, encrypted_str = None):
        '''解密文本数据'''
        pass
    # WARNING: Decompyle incomplete


_crypto_manager = CryptoManager()

def encrypt_text(text = None):
    '''加密文本的便捷函数'''
    return _crypto_manager.encrypt_text(text)


def decrypt_text(encrypted_str = None):
    '''解密文本的便捷函数'''
    return _crypto_manager.decrypt_text(encrypted_str)


def encrypt_dict(data = None):
    '''加密字典的便捷函数'''
    return _crypto_manager.encrypt_dict(data)


def decrypt_dict(encrypted_str = None):
    '''解密字典的便捷函数'''
    return _crypto_manager.decrypt_dict(encrypted_str)

