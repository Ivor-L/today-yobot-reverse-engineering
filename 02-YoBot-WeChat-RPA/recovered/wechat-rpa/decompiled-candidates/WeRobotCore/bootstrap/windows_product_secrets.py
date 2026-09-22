# UNVERIFIED DECOMPILER OUTPUT: may contain incorrect behavior.
# Source Generated with Decompyle++
# File: windows_product_secrets.marshal (Python 3.9)

'''Lazy mapping from Product Runtime secret keys to existing Windows config.'''
import copy
from types import MappingProxyType
from typing import Any, Callable, Dict, Mapping, Optional, Protocol, Tuple
from WeRobotCore.adapters.platform import CallbackSecretValueBackend
WINDOWS_PRODUCT_SECRET_PATHS = MappingProxyType({
    'voice.doubao.access_token': ('doubao', 'access_token'),
    'voice.doubao.api_key': ('doubao', 'api_key'),
    'voice.doubao.secret_access_key': ('doubao', 'secret_access_key') })

class WindowsProductConfigManager(Protocol):
    
    def load_config(self = None, config_type = None, use_cache = None):
        pass

    
    def save_config(self = None, config_type = None, config = None):
        pass



def create_windows_product_secret_backend(config_manager_factory = None, *, config_type, key_paths):
    '''Bind DPAPI ciphertext to the existing product-owned JSON document.

    The returned backend reads and writes raw values. Encryption remains owned
    by ``WindowsDpapiSecretStore``. Construction is completely lazy: it does
    not create a ConfigManager, read a file, or mutate the existing schema.
    Only explicitly mapped keys are writable, preventing a new catch-all
    secret namespace from appearing inside legacy configuration files.
    '''
    if not callable(config_manager_factory):
        raise TypeError('config_manager_factory must be callable')
    if not isinstance(config_type, str) or config_type.strip():
        raise ValueError('config_type must be a non-empty string')
    normalized_paths = { }
    for key, path in key_paths.items():
        if not isinstance(key, str) or key.strip():
            raise ValueError('secret keys must be non-empty strings')
        if isinstance(path, tuple) and path or any((lambda .0: for part in .0:
if not not isinstance(part, str):
passnot part)(path)):
            raise ValueError('secret paths must be non-empty string tuples')
        normalized_paths[key.strip()] = path
    
    def path_for(key = None):
        return normalized_paths.get(key)

    
    def load_document():
        manager = config_manager_factory()
        if not manager.load_config(config_type, False, **('use_cache',)):
            pass
        document = { }
        if not isinstance(document, dict):
            raise TypeError('Windows product secret config must be an object')
        return copy.deepcopy(document)

    
    def save_document(document = None):
        manager = config_manager_factory()
        if manager.save_config(config_type, document) is not True:
            raise RuntimeError('Windows product secret config could not be saved')

    
    def reader(key = None):
        path = path_for(key)
        if path is None:
            return None
        current = None()
        for part in path:
            if isinstance(current, dict) or part not in current:
                return None
            current = None[part]
        if current is None or current == '':
            return None
        if not None(current, str):
            raise TypeError('Windows product secret value must be a string')
        return current

    
    def writer(key = None, value = None):
        path = path_for(key)
        if path is None:
            raise KeyError('unmapped Windows product secret key')
        document = load_document()
        current = document
        for part in path[:-1]:
            child = current.get(part)
            if child is None:
                child = { }
                current[part] = child
            if not isinstance(child, dict):
                raise TypeError('Windows product secret path is not an object')
            current = child
        current[path[-1]] = value
        save_document(document)

    
    def deleter(key = None):
        path = path_for(key)
        if path is None:
            raise KeyError('unmapped Windows product secret key')
        document = load_document()
        current = document
        for part in path[:-1]:
            child = current.get(part)
            if not isinstance(child, dict):
                return None
            current = None
        if path[-1] not in current:
            return None
        del None[path[-1]]
        save_document(document)

    return CallbackSecretValueBackend(reader, writer, deleter, **('reader', 'writer', 'deleter'))

__all__ = [
    'WINDOWS_PRODUCT_SECRET_PATHS',
    'WindowsProductConfigManager',
    'create_windows_product_secret_backend']
